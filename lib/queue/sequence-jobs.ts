/**
 * Sequence Step Jobs — Phase 2.
 *
 * Handles BullMQ jobs named `send-sequence-step` with data:
 *   { dmLogId: string; stepOrder: number }
 *
 * Rules enforced here:
 * - Exactly one follow-up per step; idempotent via SequenceDelivery upsert.
 * - Follow-up DMs go through the Instagram Send API and REQUIRE an open
 *   24h messaging window (an InboundMessage from the commenter within 24h).
 *   Without one the delivery is marked SKIPPED_WINDOW_CLOSED — no cold DMs.
 * - Workspace DM plan reservation + per-account 750/hr rate limiter.
 * - MetaApiError → delivery FAILED, reservation released, rethrow for retry.
 *
 * NOTE (contract gap, 2026-10-19): the Phase 2 contract assumed
 * `sendDirectMessage` would be provided by `@/lib/meta/client`, but Phase 1
 * only ships `sendPrivateReply` there and `lib/meta/*` is not editable in
 * this phase. A local `sendDirectMessage` is implemented below as the
 * fallback; it should be moved into `@/lib/meta/client` by whoever owns
 * that file and the import updated.
 */

import type { Job } from "bullmq";
import type { Queue } from "bullmq";
import { dbx } from "@/lib/db/extended";
import { prisma } from "@/lib/db/client";
import { getDMQueue } from "@/lib/queue/client";
import { MetaApiError, sendDirectMessage } from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";
import { reserveDMSlot } from "@/lib/utils/rate-limiter";
import {
  releaseWorkspaceDMReservation,
  reserveWorkspaceDMSend,
} from "@/lib/billing/usage";
import { renderMessageWithTracking } from "@/lib/tracking/message";

export interface SendSequenceStepJob {
  dmLogId: string;
  stepOrder: number;
}

const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

function truncate(message: string, max = 500): string {
  return message.length > max ? message.slice(0, max) : message;
}

export async function tryHandleSequenceJob(job: Job): Promise<boolean> {
  if (job.name !== "send-sequence-step") {
    return false;
  }

  const data = job.data as Partial<SendSequenceStepJob>;
  const dmLogId = data.dmLogId;
  const stepOrder = data.stepOrder;
  if (!dmLogId || typeof stepOrder !== "number") {
    // Malformed job — nothing to do, swallow it so it doesn't retry forever.
    return true;
  }

  const dmLog = await dbx.dmLog.findUnique({
    where: { id: dmLogId },
    include: {
      automation: {
        include: {
          instagramAccount: true,
          trackedLinks: {
            select: { slug: true, destinationUrl: true },
          },
        },
      },
      instagramAccount: true,
    },
  });
  if (!dmLog) return true;

  const automation = dmLog.automation;
  const account = dmLog.instagramAccount;
  if (!automation || !automation.isActive || !account) return true;
  // Only follow up on DMs that actually went out.
  if (dmLog.status !== "SENT") return true;

  const step = await dbx.sequenceStep.findUnique({
    where: {
      automationId_stepOrder: {
        automationId: automation.id,
        stepOrder,
      },
    },
  });
  if (!step) return true;

  // Idempotency: one delivery row per (dmLogId, stepOrder).
  const delivery = await dbx.sequenceDelivery.upsert({
    where: { dmLogId_stepOrder: { dmLogId, stepOrder } },
    create: { dmLogId, stepOrder, status: "PENDING" },
    update: {},
  });
  if (delivery.status === "SENT") return true;

  // 24h messaging window: the commenter must have sent us a DM within 24h.
  const windowStart = new Date(Date.now() - MESSAGING_WINDOW_MS);
  const inbound = await dbx.inboundMessage.findFirst({
    where: {
      instagramAccountId: account.id,
      senderId: dmLog.commenterId,
      receivedAt: { gt: windowStart },
    },
    orderBy: { receivedAt: "desc" },
  });
  if (!inbound) {
    await dbx.sequenceDelivery.update({
      where: { id: delivery.id },
      data: { status: "SKIPPED_WINDOW_CLOSED" },
    });
    return true;
  }

  // Workspace plan reservation (kept PENDING + logged on plan-limit hit).
  const reservation = await reserveWorkspaceDMSend(automation.workspaceId);
  if (!reservation.allowed) {
    await prisma.operationalEvent
      .create({
        data: {
          workspaceId: automation.workspaceId,
          source: "WORKER",
          level: "WARNING",
          message: `Sequence step ${stepOrder} for DM ${dmLogId} kept pending: workspace DM plan limit reached`,
          payload: {
            dmLogId,
            stepOrder,
            automationId: automation.id,
            instagramAccountId: account.id,
          },
        },
      })
      .catch((err: unknown) => console.error("[Sequence] failed to log plan-limit event:", err));
    return true;
  }

  // Per-account rate limit (750/hr). Requeue on transient pressure,
  // skip after max requeue attempts.
  const rateLimit = await reserveDMSlot(account.id, job.attemptsMade ?? 0);
  if (!rateLimit.allowed) {
    if (rateLimit.shouldRequeue) {
      const queue = getDMQueue() as unknown as Queue<SendSequenceStepJob>;
      await queue.add(
        "send-sequence-step",
        { dmLogId, stepOrder },
        {
          delay: rateLimit.requeueDelayMs,
          jobId: `seq:${dmLogId}:${stepOrder}:retry`,
        }
      );
      await releaseWorkspaceDMReservation(
        automation.workspaceId,
        reservation.periodStart
      );
      return true;
    }
    await dbx.sequenceDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SKIPPED_RATE_LIMIT",
        errorMessage: "Account rate limit exhausted after max requeue attempts",
      },
    });
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      reservation.periodStart
    );
    return true;
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(account.accessToken);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to decrypt access token";
    await dbx.sequenceDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorMessage: truncate(message) },
    });
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      reservation.periodStart
    );
    return true;
  }

  const text = renderMessageWithTracking({
    message: step.message,
    commenterName: dmLog.commenterName,
    trackedLinks: automation.trackedLinks ?? [],
    variant: dmLog.variant,
  });

  try {
    await sendDirectMessage(
      accessToken,
      account.instagramId,
      dmLog.commenterId,
      text,
      step.quickReplies
    );
  } catch (error) {
    const message =
      error instanceof MetaApiError
        ? `Meta API Error ${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Unknown send error";
    await dbx.sequenceDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorMessage: truncate(message) },
    });
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      reservation.periodStart
    );
    throw error; // BullMQ retry
  }

  await dbx.sequenceDelivery.update({
    where: { id: delivery.id },
    data: { status: "SENT", sentAt: new Date() },
  });
  return true;
}
