/**
 * Extended DB access for feature-phase models/fields.
 *
 * The generated Prisma client in `app/generated/prisma` is STALE in this
 * sandbox (it was generated before the feature-phase schema change, and
 * `prisma generate` cannot run here). This module provides hand-written row
 * types + a cast wrapper so TypeScript stays clean.
 *
 * RUNTIME SAFETY: the real Prisma client already handles these models once
 * `prisma generate` runs (Vercel build does this automatically). The cast is
 * a no-op at runtime.
 *
 * RULE: use `dbx` (not `prisma`) for any query touching a NEW model, a NEW
 * field on Automation/DmLog/LinkClick, or a NEW DmStatus/BroadcastStatus
 * value. Existing code touching old fields keeps using `prisma`.
 */

import { prisma } from "@/lib/db/client";

export interface InstagramAccountRow {
  id: string;
  workspaceId: string;
  instagramId: string;
  username: string;
  name: string | null;
  accessToken: string;
  tokenExpiresAt: Date | null;
  webhookSubscribed: boolean;
  connectedAt: Date;
  updatedAt: Date;
}

export interface TrackedLinkRow {
  id: string;
  workspaceId: string;
  automationId: string;
  slug: string;
  label: string | null;
  destinationUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceStepRow {
  id: string;
  automationId: string;
  stepOrder: number;
  delayMinutes: number;
  message: string;
  quickReplies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationExt {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  name: string;
  goal: string | null;
  postId: string | null;
  postUrl: string | null;
  keywords: string[];
  excludedKeywords: string[];
  dmMessage: string;
  isActive: boolean;
  wholeWordMatch: boolean;
  reportShareSlug: string | null;
  reportShareEnabled: boolean;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  publicReplyEnabled: boolean;
  publicReplyText: string | null;
  followNudgeEnabled: boolean;
  followNudgeMessage: string | null;
  quickReplies: string[];
  autoTag: string | null;
  hideKeywords: string[];
  abTestEnabled: boolean;
  dmMessageVariantB: string | null;
  storyTriggerEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  instagramAccount?: InstagramAccountRow;
  trackedLinks?: TrackedLinkRow[];
  sequenceSteps?: SequenceStepRow[];
}

export interface DmLogExt {
  id: string;
  workspaceId: string;
  automationId: string;
  instagramAccountId: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  commentId: string;
  matchedKeyword: string | null;
  status: string;
  attempts: number;
  dmSentAt: Date | null;
  errorMessage: string | null;
  variant: string | null;
  tags: string[];
  nudgeExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  automation?: AutomationExt;
  instagramAccount?: InstagramAccountRow;
}

export interface InboundMessageRow {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  senderId: string;
  senderName: string | null;
  messageText: string | null;
  mid: string | null;
  receivedAt: Date;
  createdAt: Date;
}

export interface TagRow {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: Date;
}

export type BroadcastStatusValue =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export interface BroadcastRow {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  name: string | null;
  message: string;
  quickReplies: string[];
  scheduledAt: Date | null;
  status: string;
  sentCount: number;
  totalCount: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  instagramAccount?: InstagramAccountRow;
}

export interface SequenceDeliveryRow {
  id: string;
  dmLogId: string;
  stepOrder: number;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkClickExt {
  id: string;
  workspaceId: string;
  automationId: string;
  instagramAccountId: string;
  trackedLinkId: string;
  variant: string | null;
  createdAt: Date;
}

// Loose delegate: args are untyped on purpose (stale generated client can't
// type new fields). Field names are validated at runtime by Prisma.
export type AnyArgs = Record<string, unknown>;

export interface ModelDelegate<T> {
  findMany(args?: AnyArgs): Promise<T[]>;
  findUnique(args: AnyArgs): Promise<T | null>;
  findFirst(args?: AnyArgs): Promise<T | null>;
  create(args: AnyArgs): Promise<T>;
  update(args: AnyArgs): Promise<T>;
  upsert(args: AnyArgs): Promise<T>;
  delete(args: AnyArgs): Promise<T>;
  deleteMany(args?: AnyArgs): Promise<{ count: number }>;
  count(args?: AnyArgs): Promise<number>;
  groupBy(args: AnyArgs): Promise<AnyArgs[]>;
  aggregate(args: AnyArgs): Promise<AnyArgs>;
  updateMany(args: AnyArgs): Promise<{ count: number }>;
}

export interface ExtendedDb {
  automation: ModelDelegate<AutomationExt>;
  dmLog: ModelDelegate<DmLogExt>;
  sequenceStep: ModelDelegate<SequenceStepRow>;
  sequenceDelivery: ModelDelegate<SequenceDeliveryRow>;
  inboundMessage: ModelDelegate<InboundMessageRow>;
  tag: ModelDelegate<TagRow>;
  broadcast: ModelDelegate<BroadcastRow>;
  linkClick: ModelDelegate<LinkClickExt>;
  instagramAccount: ModelDelegate<InstagramAccountRow>;
}

/** Extended Prisma client — see module docstring for when to use. */
export const dbx = prisma as unknown as ExtendedDb;
