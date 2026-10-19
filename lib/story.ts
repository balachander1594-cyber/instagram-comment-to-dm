/**
 * Story reply triggers.
 *
 * Phase 1's inbound-message processor calls maybeHandleStoryTrigger for
 * story replies. Finds active automations with storyTriggerEnabled for the
 * account, keyword-matches the story reply text, and sends the DM via the
 * Send API (the 24h messaging window is open — the user just messaged).
 * Logs a DmLog with commentId = `story:<mid>`.
 */
import { dbx } from "@/lib/db/extended";
import { decryptToken } from "@/lib/meta/oauth";
import { sendDirectMessage } from "@/lib/meta/client";
import { prisma } from "@/lib/db/client";
import {
  reserveWorkspaceDMSend,
  releaseWorkspaceDMReservation,
} from "@/lib/billing/usage";
import { reserveDMSlot } from "@/lib/utils/rate-limiter";
import {
  renderMessageWithTracking,
  type MessageTrackedLink,
} from "@/lib/tracking/message";
import { matchKeywords } from "@/lib/utils/keyword-matcher";
import { scheduleSequenceSteps } from "@/lib/sequences";

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function recordStoryEvent(
  workspaceId: string,
  level: "INFO" | "WARNING" | "ERROR",
  message: string,
  payload?: Record<string, unknown>
) {
  try {
    await prisma.operationalEvent.create({
      data: {
        workspaceId,
        source: "WORKER",
        level,
        message,
        payload,
      },
    });
  } catch (recordError) {
    console.error("[story] Failed to record operational event:", recordError);
  }
}

export async function maybeHandleStoryTrigger(args: {
  instagramAccountId: string; // IG-scoped account id (entry.id)
  senderId: string;
  senderName?: string;
  text: string;
  mid: string;
}): Promise<void> {
  const { instagramAccountId, senderId, senderName, text, mid } = args;

  const account = await dbx.instagramAccount.findUnique({
    where: { instagramId: instagramAccountId },
  });
  if (!account) return;

  const automations = await dbx.automation.findMany({
    where: {
      instagramAccountId: account.id,
      isActive: true,
      storyTriggerEnabled: true,
    },
    include: { trackedLinks: true },
  });
  if (automations.length === 0) return;

  let accessToken: string;
  try {
    accessToken = decryptToken(account.accessToken);
  } catch (error) {
    await recordStoryEvent(
      account.workspaceId,
      "ERROR",
      `Story trigger: failed to decrypt token for @${account.username}: ${formatError(error)}`,
      { instagramAccountId: account.id }
    );
    return;
  }

  const commentId = `story:${mid}`;

  for (const automation of automations) {
    try {
      // Exclusion check — excluded keywords always win.
      if (automation.excludedKeywords?.length) {
        const excluded = matchKeywords(
          text,
          automation.excludedKeywords,
          automation.wholeWordMatch
        );
        if (excluded.matched) continue;
      }

      const match = matchKeywords(
        text,
        automation.keywords,
        automation.wholeWordMatch
      );
      if (!match.matched) continue;

      // Dedup: one DM per automation per story message.
      const existing = await dbx.dmLog.findUnique({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId,
          },
        },
      });
      if (existing) continue;

      const usage = await reserveWorkspaceDMSend(automation.workspaceId);
      if (!usage.allowed) {
        await dbx.dmLog.create({
          data: {
            workspaceId: automation.workspaceId,
            automationId: automation.id,
            instagramAccountId: account.id,
            commenterId: senderId,
            commenterName: senderName ?? null,
            commentText: text,
            commentId,
            matchedKeyword: match.matchedKeyword,
            status: "SKIPPED_PLAN_LIMIT",
          },
        });
        continue;
      }

      const slot = await reserveDMSlot(account.id);
      if (!slot.allowed) {
        if (slot.shouldSkip) {
          await dbx.dmLog.create({
            data: {
              workspaceId: automation.workspaceId,
              automationId: automation.id,
              instagramAccountId: account.id,
              commenterId: senderId,
              commenterName: senderName ?? null,
              commentText: text,
              commentId,
              matchedKeyword: match.matchedKeyword,
              status: "SKIPPED_RATE_LIMIT",
            },
          });
        }
        // Requeue case: skip quietly — the story window is 24h anyway and
        // the sender just messaged, so a later story reply will re-trigger.
        await releaseWorkspaceDMReservation(
          automation.workspaceId,
          usage.periodStart
        ).catch(() => {});
        continue;
      }

      const trackedLinks: MessageTrackedLink[] = (
        automation.trackedLinks ?? []
      ).map((link) => ({
        slug: link.slug,
        destinationUrl: link.destinationUrl,
      }));

      const rendered = renderMessageWithTracking({
        message: automation.dmMessage,
        commenterName: senderName,
        trackedLinks,
        variant: null,
      });

      await sendDirectMessage(
        accessToken,
        account.instagramId,
        senderId,
        rendered,
        automation.quickReplies
      );

      const dmLog = await dbx.dmLog.create({
        data: {
          workspaceId: automation.workspaceId,
          automationId: automation.id,
          instagramAccountId: account.id,
          commenterId: senderId,
          commenterName: senderName ?? null,
          commentText: text,
          commentId,
          matchedKeyword: match.matchedKeyword,
          status: "SENT",
          dmSentAt: new Date(),
          tags: automation.autoTag ? [automation.autoTag] : [],
        },
      });

      await scheduleSequenceSteps(dmLog.id);
    } catch (error) {
      // FAILED log + continue with the next automation. Never overwrite a
      // SENT log (e.g. if scheduleSequenceSteps threw after the DM went out).
      const message = formatError(error);
      try {
        const existingSent = await dbx.dmLog.findFirst({
          where: {
            automationId: automation.id,
            commentId,
            status: "SENT",
          },
        });
        if (existingSent) {
          await recordStoryEvent(
            automation.workspaceId,
            "WARNING",
            `Story trigger: DM sent but follow-up failed for automation ${automation.id}: ${message}`,
            { automationId: automation.id, commentId }
          );
          continue;
        }
        await dbx.dmLog.upsert({
          where: {
            automationId_commentId: {
              automationId: automation.id,
              commentId,
            },
          },
          create: {
            workspaceId: automation.workspaceId,
            automationId: automation.id,
            instagramAccountId: account.id,
            commenterId: senderId,
            commenterName: senderName ?? null,
            commentText: text,
            commentId,
            matchedKeyword: null,
            status: "FAILED",
            errorMessage: message,
          },
          update: {
            status: "FAILED",
            errorMessage: message,
          },
        });
      } catch (logError) {
        console.error(
          `[story] Failed to record FAILED log for automation ${automation.id}:`,
          formatError(logError)
        );
      }
    }
  }
}
