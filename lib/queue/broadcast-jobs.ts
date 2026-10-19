/**
 * Broadcast job handling.
 *
 * Phase 1's worker default-case calls tryHandleBroadcastJob. Contract:
 *   tryHandleBroadcastJob(job: Job): Promise<boolean>
 * Returns true when the job was a broadcast job and has been handled,
 * false otherwise. Handles job name `send-broadcast-recipient`.
 *
 * META CONSTRAINTS enforced here:
 * - Broadcast/sequence DMs need an OPEN 24h messaging window: the handler
 *   verifies an inbound message from the recipient within the last 24h and
 *   skips silently when the window is closed.
 * - Each recipient job reserves its own rate-limit slot (paced one-by-one).
 * - On MetaApiError the job throws so BullMQ retries it.
 */
import type { Job, Queue } from "bullmq";
import { dbx } from "@/lib/db/extended";
import { decryptToken } from "@/lib/meta/oauth";
import { sendDirectMessage } from "@/lib/meta/client";
import {
  reserveWorkspaceDMSend,
  releaseWorkspaceDMReservation,
} from "@/lib/billing/usage";
import { reserveDMSlot } from "@/lib/utils/rate-limiter";
import { renderMessageWithTracking } from "@/lib/tracking/message";
import { getDMQueue } from "@/lib/queue/client";
import {
  getActiveWindowCutoff,
  type BroadcastRecipientJobData,
} from "@/lib/broadcasts";

interface RecipientJobPayload {
  broadcastId?: unknown;
  recipientSenderId?: unknown;
}

export async function tryHandleBroadcastJob(job: Job): Promise<boolean> {
  if (job.name !== "send-broadcast-recipient") return false;

  const data = (job.data ?? {}) as RecipientJobPayload;
  const broadcastId =
    typeof data.broadcastId === "string" ? data.broadcastId : null;
  const recipientSenderId =
    typeof data.recipientSenderId === "string" ? data.recipientSenderId : null;
  if (!broadcastId || !recipientSenderId) {
    // Malformed payload — treat as handled so it doesn't poison the queue.
    return true;
  }

  const broadcast = await dbx.broadcast.findUnique({
    where: { id: broadcastId },
    include: { instagramAccount: true },
  });
  if (!broadcast) return true;
  // Broadcast was cancelled/completed after the job was enqueued — drop.
  if (broadcast.status !== "SENDING") return true;

  const account = broadcast.instagramAccount;
  if (!account) {
    await dbx.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: "FAILED",
        errorMessage: "Instagram account not found",
      },
    });
    return true;
  }

  // 24h messaging window check — verified per recipient at send time.
  const recentInbound = await dbx.inboundMessage.findFirst({
    where: {
      instagramAccountId: account.id,
      senderId: recipientSenderId,
      receivedAt: { gt: getActiveWindowCutoff() },
    },
    orderBy: { receivedAt: "desc" },
  });
  if (!recentInbound) {
    // Window closed — skip silently (NO cold DMs).
    return true;
  }

  const usage = await reserveWorkspaceDMSend(broadcast.workspaceId);
  if (!usage.allowed) {
    // Leave the broadcast SENDING — the operator can retry once the plan
    // resets. No DM was sent, so nothing was consumed.
    return true;
  }

  const slot = await reserveDMSlot(account.id, job.attemptsMade ?? 0);
  if (!slot.allowed) {
    // Release the workspace reservation since nothing is being sent now.
    await releaseWorkspaceDMReservation(
      broadcast.workspaceId,
      usage.periodStart
    ).catch(() => {});

    if (slot.shouldRequeue) {
      const queue = getDMQueue() as unknown as Queue<BroadcastRecipientJobData>;
      await queue.add(
        "send-broadcast-recipient",
        { broadcastId, recipientSenderId },
        {
          jobId: `bc:${broadcastId}:${recipientSenderId}:retry`,
          delay: slot.requeueDelayMs,
        }
      );
    }
    return true;
  }

  try {
    const token = decryptToken(account.accessToken);
    const rendered = renderMessageWithTracking({
      message: broadcast.message,
      trackedLinks: [],
    });

    await sendDirectMessage(
      token,
      account.instagramId,
      recipientSenderId,
      rendered,
      broadcast.quickReplies
    );

    const updated = await dbx.broadcast.update({
      where: { id: broadcastId },
      data: { sentCount: { increment: 1 } },
    });
    if (updated.sentCount >= updated.totalCount) {
      await dbx.broadcast.update({
        where: { id: broadcastId },
        data: { status: "SENT" },
      });
    }
  } catch (error) {
    // Reservation consumed nothing — release it, then let BullMQ retry.
    await releaseWorkspaceDMReservation(
      broadcast.workspaceId,
      usage.periodStart
    ).catch(() => {});
    throw error;
  }

  return true;
}
