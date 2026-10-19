/**
 * BullMQ Queue Client
 *
 * Provides the DM processing queue and Redis connection for BullMQ.
 */

import { Queue } from "bullmq";
import Redis from "ioredis";

let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
  }
  return connection;
}

// ─── DM Queue ───────────────────────────────────────────────────────────────────

export interface ProcessCommentJob {
  instagramAccountId: string;
  commentId: string;
  commentText: string;
  commenterId: string;
  commenterName?: string;
  mediaId: string;
  requeueAttempt?: number;
  /** "webhook" for live events, "backtrack" for the manual backfill endpoint. */
  source?: "webhook" | "backtrack";
}

/** Enqueued by the match phase ("process-comment") once a comment qualifies. */
export interface DeliverDmJob {
  automationId: string;
  instagramAccountId: string;
  commentId: string;
  commentText: string;
  commenterId: string;
  commenterName?: string;
  mediaId: string;
  requeueAttempt?: number;
}

/** Enqueued by the webhook route for Instagram messaging events. */
export interface ProcessInboundMessageJob {
  instagramAccountId: string;
  senderId: string;
  senderName?: string;
  text?: string;
  timestamp: number;
  isStoryReply: boolean;
  mid: string;
}

/** Enqueued by lib/sequences (Phase 2). */
export interface SendSequenceStepJob {
  dmLogId: string;
  stepOrder: number;
}

/** Enqueued by broadcast jobs (Phase 3). */
export interface SendBroadcastRecipientJob {
  broadcastId: string;
  recipientSenderId: string;
}

/** Every payload shape the dm-processing queue can carry. */
export type DMQueueJobData =
  | ProcessCommentJob
  | DeliverDmJob
  | ProcessInboundMessageJob
  | SendSequenceStepJob
  | SendBroadcastRecipientJob;

let dmQueue: Queue<DMQueueJobData> | null = null;

export function getDMQueue(): Queue<DMQueueJobData> {
  if (!dmQueue) {
    dmQueue = new Queue<DMQueueJobData>("dm-processing", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 1000 }, // Keep last 1000 completed jobs
        removeOnFail: { count: 5000 }, // Keep last 5000 failed jobs
        attempts: 3,
        backoff: {
          type: "custom",
        },
      },
    });
  }
  return dmQueue;
}
