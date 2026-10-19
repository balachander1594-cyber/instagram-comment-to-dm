import { Worker, type Job } from "bullmq";
import {
  getDMQueue,
  getRedisConnection,
  type DeliverDmJob,
  type DMQueueJobData,
  type ProcessCommentJob,
  type ProcessInboundMessageJob,
} from "./client";
import { prisma } from "@/lib/db/client";
import { dbx } from "@/lib/db/extended";
import {
  MetaApiError,
  replyToCommentPublicly,
  sendDirectMessage,
  sendPrivateReply,
} from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";
import { matchKeywords } from "@/lib/utils/keyword-matcher";
import { reserveDMSlot } from "@/lib/utils/rate-limiter";
import {
  releaseWorkspaceDMReservation,
  reserveWorkspaceDMSend,
} from "@/lib/billing/usage";
import { recordWorkerAlert } from "@/lib/ops/worker-health";
import { renderMessageWithTracking } from "@/lib/tracking/message";
import { scheduleSequenceSteps } from "@/lib/sequences";
import { tryHandleSequenceJob } from "@/lib/queue/sequence-jobs";
import { tryHandleBroadcastJob } from "@/lib/queue/broadcast-jobs";
import { maybeHideSpam } from "@/lib/spam";
import { maybeHandleStoryTrigger } from "@/lib/story";
import { DEFAULT_NUDGE_MESSAGE, NUDGE_WINDOW_MS } from "@/lib/automation-defaults";

const BACKOFF_DELAYS = [5 * 60 * 1000, 15 * 60 * 1000, 45 * 60 * 1000];

function formatError(error: unknown): string {
  if (error instanceof MetaApiError) {
    return `Meta API Error ${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function logWhere(automationId: string, commentId: string) {
  return {
    automationId_commentId: {
      automationId,
      commentId,
    },
  };
}

/**
 * Match phase ("process-comment").
 *
 * Finds active automations for the comment's post (or universal ones with
 * postId=null), runs keyword/exclusion matching, and enqueues a "deliver-dm"
 * job for every qualifying automation. No DM is sent here.
 */
async function processComment(job: Job<ProcessCommentJob>): Promise<void> {
  const {
    instagramAccountId,
    commentId,
    commentText,
    commenterId,
    commenterName,
    mediaId,
  } = job.data;

  const automations = await dbx.automation.findMany({
    where: {
      isActive: true,
      instagramAccount: {
        instagramId: instagramAccountId,
      },
      OR: [{ postId: mediaId }, { postId: null }],
    },
    include: {
      instagramAccount: true,
      workspace: true,
      trackedLinks: {
        select: {
          slug: true,
          destinationUrl: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const automation of automations) {
    // (a) Excluded keywords — skip silently.
    if (
      matchKeywords(
        commentText,
        automation.excludedKeywords ?? [],
        automation.wholeWordMatch
      ).matched
    ) {
      continue;
    }

    // (b) Keyword match.
    const matchResult = matchKeywords(
      commentText,
      automation.keywords,
      automation.wholeWordMatch
    );

    if (!matchResult.matched) {
      continue;
    }

    // (c) Decrypt the IG token (keep existing FAILED handling).
    if (!automation.instagramAccount?.accessToken) {
      await dbx.dmLog.upsert({
        where: logWhere(automation.id, commentId),
        create: {
          workspaceId: automation.workspaceId,
          automationId: automation.id,
          instagramAccountId: automation.instagramAccountId,
          commenterId,
          commenterName,
          commentText,
          commentId,
          matchedKeyword: matchResult.matchedKeyword,
          status: "FAILED",
          errorMessage: "No Instagram access token available",
        },
        update: {
          status: "FAILED",
          errorMessage: "No Instagram access token available",
        },
      });
      continue;
    }

    let accessToken: string;
    try {
      accessToken = decryptToken(automation.instagramAccount.accessToken);
    } catch {
      await dbx.dmLog.upsert({
        where: logWhere(automation.id, commentId),
        create: {
          workspaceId: automation.workspaceId,
          automationId: automation.id,
          instagramAccountId: automation.instagramAccountId,
          commenterId,
          commenterName,
          commentText,
          commentId,
          matchedKeyword: matchResult.matchedKeyword,
          status: "FAILED",
          errorMessage: "Failed to decrypt Instagram access token",
        },
        update: {
          status: "FAILED",
          errorMessage: "Failed to decrypt Instagram access token",
        },
      });
      continue;
    }

    // (d) Spam auto-hide (Phase 3 stub).
    if (
      await maybeHideSpam({
        automation: {
          hideKeywords: automation.hideKeywords ?? [],
          wholeWordMatch: automation.wholeWordMatch,
          workspaceId: automation.workspaceId,
        },
        commentId,
        commentText,
        accessToken,
      })
    ) {
      continue;
    }

    // (e) Dedup — never send twice for the same comment/automation.
    const existingLog = await dbx.dmLog.findUnique({
      where: logWhere(automation.id, commentId),
    });

    if (
      existingLog?.status === "SENT" ||
      existingLog?.status === "SKIPPED_PLAN_LIMIT" ||
      existingLog?.status === "SKIPPED_RATE_LIMIT"
    ) {
      continue;
    }

    // (f) Choose A/B variant, record a PENDING log.
    const variant = automation.abTestEnabled
      ? Math.random() < 0.5
        ? "A"
        : "B"
      : null;
    const nudgeExpiresAt = automation.followNudgeEnabled
      ? new Date(Date.now() + NUDGE_WINDOW_MS)
      : null;
    const tags = automation.autoTag ? [automation.autoTag] : [];

    await dbx.dmLog.upsert({
      where: logWhere(automation.id, commentId),
      create: {
        workspaceId: automation.workspaceId,
        automationId: automation.id,
        instagramAccountId: automation.instagramAccountId,
        commenterId,
        commenterName,
        commentText,
        commentId,
        matchedKeyword: matchResult.matchedKeyword,
        status: "PENDING",
        attempts: job.attemptsMade + 1,
        errorMessage: null,
        variant,
        tags,
        nudgeExpiresAt,
      },
      update: {
        status: "PENDING",
        attempts: job.attemptsMade + 1,
        matchedKeyword: matchResult.matchedKeyword,
        errorMessage: null,
        variant,
        tags,
        nudgeExpiresAt,
      },
    });

    // (g) Enqueue the send phase with the smart delay.
    const minDelaySeconds = automation.minDelaySeconds ?? 0;
    const maxDelaySeconds = Math.max(
      minDelaySeconds,
      automation.maxDelaySeconds ?? 0
    );
    const delaySeconds =
      minDelaySeconds === maxDelaySeconds
        ? minDelaySeconds
        : minDelaySeconds +
          Math.floor(Math.random() * (maxDelaySeconds - minDelaySeconds + 1));

    await getDMQueue().add(
      "deliver-dm",
      {
        automationId: automation.id,
        instagramAccountId,
        commentId,
        commentText,
        commenterId,
        commenterName,
        mediaId,
      } satisfies DeliverDmJob,
      {
        delay: delaySeconds * 1000,
        jobId: `dm:${automation.id}:${commentId}`,
      }
    );
  }
}

/**
 * Send phase ("deliver-dm").
 *
 * Reserves usage + rate-limit slots, optionally posts a public comment reply,
 * sends exactly ONE private reply for the comment, then records the outcome.
 */
async function deliverDm(job: Job<DeliverDmJob>): Promise<void> {
  const {
    automationId,
    instagramAccountId,
    commentId,
    commenterName,
  } = job.data;
  const requeueAttempt = job.data.requeueAttempt ?? 0;

  const dmLog = await dbx.dmLog.findUnique({
    where: logWhere(automationId, commentId),
  });

  if (!dmLog || dmLog.status !== "PENDING") {
    return;
  }

  const automation = await dbx.automation.findUnique({
    where: { id: automationId },
    include: {
      instagramAccount: true,
      workspace: true,
      trackedLinks: {
        select: {
          slug: true,
          destinationUrl: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!automation || !automation.isActive) {
    await dbx.dmLog.update({
      where: logWhere(automationId, commentId),
      data: {
        status: "FAILED",
        errorMessage: "Campaign is no longer active",
      },
    });
    return;
  }

  const usage = await reserveWorkspaceDMSend(automation.workspaceId);
  if (!usage.allowed) {
    await dbx.dmLog.update({
      where: logWhere(automationId, commentId),
      data: {
        status: "SKIPPED_PLAN_LIMIT",
        errorMessage: `Monthly DM limit reached (${usage.limit})`,
      },
    });
    return;
  }

  let rateLimit;
  try {
    rateLimit = await reserveDMSlot(instagramAccountId, requeueAttempt);
  } catch (error) {
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      usage.periodStart
    );
    await dbx.dmLog.update({
      where: logWhere(automationId, commentId),
      data: {
        status: "FAILED",
        attempts: job.attemptsMade + 1,
        errorMessage: formatError(error),
      },
    });
    throw error;
  }

  if (!rateLimit.allowed) {
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      usage.periodStart
    );

    if (rateLimit.shouldSkip) {
      await dbx.dmLog.update({
        where: logWhere(automationId, commentId),
        data: {
          status: "SKIPPED_RATE_LIMIT",
          errorMessage: "Hourly Instagram DM rate limit reached",
        },
      });
      return;
    }

    if (rateLimit.shouldRequeue) {
      await dbx.dmLog.update({
        where: logWhere(automationId, commentId),
        data: {
          status: "PENDING",
          errorMessage: "Hourly rate limit hit; retry scheduled",
        },
      });

      await getDMQueue().add(
        "deliver-dm",
        {
          ...job.data,
          requeueAttempt: requeueAttempt + 1,
        },
        {
          delay: rateLimit.requeueDelayMs,
          jobId: `dm:${automationId}:${commentId}:retry:${requeueAttempt + 1}`,
        }
      );
      return;
    }
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(automation.instagramAccount!.accessToken);
  } catch {
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      usage.periodStart
    );
    await dbx.dmLog.update({
      where: logWhere(automationId, commentId),
      data: {
        status: "FAILED",
        attempts: job.attemptsMade + 1,
        errorMessage: "Failed to decrypt Instagram access token",
      },
    });
    return;
  }

  // Optional public comment reply (best-effort; never blocks the DM).
  if (automation.publicReplyEnabled && automation.publicReplyText) {
    try {
      await replyToCommentPublicly(
        accessToken,
        commentId,
        automation.publicReplyText.replace(
          /\{username\}/gi,
          commenterName ?? "there"
        )
      );
    } catch (error) {
      await prisma.operationalEvent
        .create({
          data: {
            workspaceId: automation.workspaceId,
            source: "WORKER",
            level: "WARNING",
            message: `Public reply failed for comment ${commentId}: ${formatError(error)}`,
            payload: { automationId, commentId },
          },
        })
        .catch((recordError: unknown) => {
          console.error(
            "[DM Worker] Failed to record public reply failure:",
            formatError(recordError)
          );
        });
    }
  }

  const variant = dmLog.variant;
  const baseMessage = automation.followNudgeEnabled
    ? (automation.followNudgeMessage ?? DEFAULT_NUDGE_MESSAGE)
    : variant === "B" && automation.abTestEnabled && automation.dmMessageVariantB
      ? automation.dmMessageVariantB
      : automation.dmMessage;

  // Nudge text gets a plain {username} replacement (no tracked link);
  // the real message goes through full tracking + A/B variant attribution.
  const dmMessage = automation.followNudgeEnabled
    ? baseMessage.replace(/\{username\}/gi, commenterName ?? "there")
    : renderMessageWithTracking({
        message: baseMessage,
        commenterName,
        trackedLinks: automation.trackedLinks,
        variant,
      });

  try {
    await sendPrivateReply(
      accessToken,
      automation.instagramAccount!.instagramId,
      commentId,
      dmMessage
    );

    if (automation.followNudgeEnabled) {
      await dbx.dmLog.update({
        where: logWhere(automationId, commentId),
        data: {
          status: "NUDGE_PENDING",
          dmSentAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      await dbx.dmLog.update({
        where: logWhere(automationId, commentId),
        data: {
          status: "SENT",
          dmSentAt: new Date(),
          errorMessage: null,
        },
      });
      await scheduleSequenceSteps(dmLog.id);
    }
  } catch (error) {
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      usage.periodStart
    );

    await dbx.dmLog.update({
      where: logWhere(automationId, commentId),
      data: {
        status: "FAILED",
        attempts: job.attemptsMade + 1,
        errorMessage: formatError(error),
      },
    });
    throw error;
  }
}

/**
 * Inbound message phase ("process-inbound-message").
 *
 * Records the message, expires stale nudges, resolves NUDGE_PENDING logs by
 * sending the real link via the Send API (24h messaging window is open —
 * the user just messaged), and hands story replies to the Phase 3 stub.
 */
async function processInboundMessage(
  job: Job<ProcessInboundMessageJob>
): Promise<void> {
  const {
    instagramAccountId,
    senderId,
    senderName,
    text,
    timestamp,
    isStoryReply,
    mid,
  } = job.data;

  const account = await prisma.instagramAccount.findUnique({
    where: { instagramId: instagramAccountId },
    select: {
      id: true,
      workspaceId: true,
      accessToken: true,
      instagramId: true,
    },
  });

  if (!account) {
    return;
  }

  await dbx.inboundMessage.upsert({
    where: { mid },
    create: {
      workspaceId: account.workspaceId,
      instagramAccountId: account.id,
      senderId,
      senderName,
      messageText: text,
      mid,
      receivedAt: new Date(timestamp),
    },
    update: {
      senderName,
      messageText: text,
      receivedAt: new Date(timestamp),
    },
  });

  // Expire nudges that never got a reply within the window.
  await dbx.dmLog.updateMany({
    where: {
      instagramAccountId: account.id,
      status: "NUDGE_PENDING",
      nudgeExpiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  // Nudge resolution: the latest still-open nudge for this sender.
  const nudgeLog = await dbx.dmLog.findFirst({
    where: {
      instagramAccountId: account.id,
      commenterId: senderId,
      status: "NUDGE_PENDING",
      nudgeExpiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (nudgeLog) {
    const automation = await dbx.automation.findUnique({
      where: { id: nudgeLog.automationId },
      include: {
        instagramAccount: true,
        trackedLinks: {
          select: {
            slug: true,
            destinationUrl: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (automation?.isActive) {
      const usage = await reserveWorkspaceDMSend(automation.workspaceId);
      if (!usage.allowed) {
        await dbx.dmLog.update({
          where: { id: nudgeLog.id },
          data: { attempts: nudgeLog.attempts + 1 },
        });
      } else {
        const rateLimit = await reserveDMSlot(instagramAccountId, 0);
        if (!rateLimit.allowed) {
          await releaseWorkspaceDMReservation(
            automation.workspaceId,
            usage.periodStart
          );
          await dbx.dmLog.update({
            where: { id: nudgeLog.id },
            data: { attempts: nudgeLog.attempts + 1 },
          });
        } else {
          let accessToken: string;
          try {
            accessToken = decryptToken(automation.instagramAccount!.accessToken);
          } catch {
            accessToken = "";
          }

          if (!accessToken) {
            await releaseWorkspaceDMReservation(
              automation.workspaceId,
              usage.periodStart
            );
          } else {
            const variant = nudgeLog.variant;
            const finalMsg = renderMessageWithTracking({
              message:
                variant === "B" && automation.dmMessageVariantB
                  ? automation.dmMessageVariantB
                  : automation.dmMessage,
              commenterName: nudgeLog.commenterName ?? senderName,
              trackedLinks: automation.trackedLinks,
              variant,
            });

            try {
              await sendDirectMessage(
                accessToken,
                account.instagramId,
                senderId,
                finalMsg,
                automation.quickReplies ?? []
              );

              await dbx.dmLog.update({
                where: { id: nudgeLog.id },
                data: {
                  status: "SENT",
                  dmSentAt: new Date(),
                  errorMessage: null,
                },
              });
              await scheduleSequenceSteps(nudgeLog.id);
            } catch (error) {
              await releaseWorkspaceDMReservation(
                automation.workspaceId,
                usage.periodStart
              );
              await dbx.dmLog.update({
                where: { id: nudgeLog.id },
                data: {
                  attempts: nudgeLog.attempts + 1,
                  errorMessage: formatError(error),
                },
              });
              throw error;
            }
          }
        }
      }
    }
  }

  // Story replies (Phase 3 stub).
  if (isStoryReply && text) {
    await maybeHandleStoryTrigger({
      instagramAccountId,
      senderId,
      senderName,
      text,
      mid,
    });
  }
}

async function recordWorkerFailure(job: Job | undefined, error: Error) {
  try {
    const data = (job?.data ?? {}) as Partial<ProcessCommentJob>;
    const instagramAccountId = data.instagramAccountId;
    const account = instagramAccountId
      ? await prisma.instagramAccount.findUnique({
          where: { instagramId: instagramAccountId },
          select: { workspaceId: true },
        })
      : null;

    await prisma.operationalEvent.create({
      data: {
        workspaceId: account?.workspaceId ?? null,
        source: "WORKER",
        level: "ERROR",
        message: `DM worker job ${job?.id ?? "unknown"} failed: ${error.message}`,
        payload: {
          jobId: job?.id ?? null,
          attemptsMade: job?.attemptsMade ?? null,
          instagramAccountId: instagramAccountId ?? null,
          commentId: data.commentId ?? null,
        },
      },
    });

    await recordWorkerAlert({
      level: "error",
      message: error.message,
      jobId: job?.id,
      instagramAccountId,
      commentId: data.commentId,
    });
  } catch (recordError) {
    console.error(
      "[DM Worker] Failed to record worker failure:",
      formatError(recordError)
    );
  }
}

async function processJob(job: Job): Promise<void> {
  switch (job.name) {
    case "process-comment":
      return processComment(job as Job<ProcessCommentJob>);
    case "deliver-dm":
      return deliverDm(job as Job<DeliverDmJob>);
    case "process-inbound-message":
      return processInboundMessage(job as Job<ProcessInboundMessageJob>);
    default: {
      if (await tryHandleSequenceJob(job)) return;
      if (await tryHandleBroadcastJob(job)) return;
      throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}

export function createDMWorker(): Worker<DMQueueJobData> {
  const worker = new Worker<DMQueueJobData>(
    "dm-processing",
    processJob,
    {
      connection: getRedisConnection(),
      concurrency: 5,
      settings: {
        backoffStrategy: (attemptsMade: number) =>
          BACKOFF_DELAYS[Math.min(attemptsMade - 1, BACKOFF_DELAYS.length - 1)],
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[DM Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[DM Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message
    );
    void recordWorkerFailure(job, err);
  });

  worker.on("error", (err) => {
    console.error("[DM Worker] Worker error:", err.message);
    void prisma.operationalEvent
      .create({
        data: {
          source: "WORKER",
          level: "ERROR",
          message: `DM worker process error: ${err.message}`,
          payload: { name: err.name },
        },
      })
      .catch((recordError: unknown) => {
        console.error(
          "[DM Worker] Failed to record worker process error:",
          formatError(recordError)
        );
      });
  });

  return worker;
}
