/**
 * Broadcast scheduling.
 *
 * enqueueBroadcast loads a DRAFT/SCHEDULED broadcast, computes the 24h-active
 * recipient set (distinct senders who messaged the account in the last 24h),
 * flips the broadcast to SENDING, and enqueues one `send-broadcast-recipient`
 * BullMQ job per recipient (paced one-by-one by the worker, each job
 * reserving its own rate-limit slot). Only an OPEN 24h messaging window may
 * receive a Broadcast/sequence DM, so the job handler re-verifies the window
 * per recipient at send time.
 */
import type { Queue } from "bullmq";
import { dbx } from "@/lib/db/extended";
import { getDMQueue } from "@/lib/queue/client";

export interface BroadcastRecipientJobData {
  broadcastId: string;
  recipientSenderId: string;
}

export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function getActiveWindowCutoff(): Date {
  return new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
}

/**
 * Distinct sender IDs that messaged the account inside the 24h window.
 */
export async function getActiveRecipients(
  instagramAccountDbId: string
): Promise<string[]> {
  const groups = await dbx.inboundMessage.groupBy({
    by: ["senderId"],
    where: {
      instagramAccountId: instagramAccountDbId,
      receivedAt: { gt: getActiveWindowCutoff() },
    },
  });
  return groups
    .map((row) => row.senderId as string)
    .filter((senderId): senderId is string => typeof senderId === "string" && senderId.length > 0);
}

export async function enqueueBroadcast(
  broadcastId: string
): Promise<{ recipientCount: number }> {
  const broadcast = await dbx.broadcast.findUnique({
    where: { id: broadcastId },
    include: { instagramAccount: true },
  });
  if (!broadcast) {
    throw new Error("Broadcast not found");
  }
  if (broadcast.status !== "DRAFT" && broadcast.status !== "SCHEDULED") {
    throw new Error(
      `Broadcast cannot be sent from status ${broadcast.status}`
    );
  }
  const account = broadcast.instagramAccount;
  if (!account) {
    throw new Error("Instagram account for broadcast not found");
  }

  const senderIds = await getActiveRecipients(account.id);

  await dbx.broadcast.update({
    where: { id: broadcastId },
    data: {
      status: "SENDING",
      totalCount: senderIds.length,
      sentCount: 0,
      errorMessage: null,
    },
  });

  // The DM queue is typed for comment-processing jobs; broadcast recipient
  // jobs carry a different payload — cast at the call site.
  const queue = getDMQueue() as unknown as Queue<BroadcastRecipientJobData>;
  await Promise.all(
    senderIds.map((senderId) =>
      queue.add(
        "send-broadcast-recipient",
        { broadcastId, recipientSenderId: senderId },
        { jobId: `bc:${broadcastId}:${senderId}` }
      )
    )
  );

  return { recipientCount: senderIds.length };
}
