-- LeadDoor feature phases migration (Phase 1 + 2 + 3, AI replies excluded)
-- Hand-written. Safe to apply with `prisma migrate deploy`.
--
-- NOTE on enums: Postgres `ALTER TYPE ... ADD VALUE` cannot run inside a
-- transaction block, and Prisma wraps each migration in one transaction.
-- So DmStatus is extended via the create-new-type + column-swap pattern,
-- which IS transaction-safe.

-- ─── 1. Extend DmStatus (transaction-safe swap) ─────────────────────────────
CREATE TYPE "DmStatus_new" AS ENUM (
  'PENDING', 'SENT', 'FAILED',
  'SKIPPED_DEDUP', 'SKIPPED_RATE_LIMIT', 'SKIPPED_PLAN_LIMIT', 'SKIPPED_NO_MATCH',
  'NUDGE_PENDING', 'EXPIRED', 'SKIPPED_WINDOW_CLOSED'
);

-- Drop the column default first: Postgres cannot auto-cast a default value
-- to the new enum type (error 42804). Re-applied after the swap.
ALTER TABLE "DmLog" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "DmLog" ALTER COLUMN "status" TYPE "DmStatus_new"
  USING "status"::text::"DmStatus_new";

ALTER TYPE "DmStatus" RENAME TO "DmStatus_old";
ALTER TYPE "DmStatus_new" RENAME TO "DmStatus";
DROP TYPE "DmStatus_old";

ALTER TABLE "DmLog" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- SequenceDelivery.status also uses DmStatus
-- (table created below, after the swap, so it picks up the new type directly)

-- ─── 2. New BroadcastStatus enum ────────────────────────────────────────────
CREATE TYPE "BroadcastStatus" AS ENUM (
  'DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'
);

-- ─── 3. Automation: universal postId + feature columns ──────────────────────
ALTER TABLE "Automation" ALTER COLUMN "postId" DROP NOT NULL;

ALTER TABLE "Automation" ADD COLUMN "excludedKeywords" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Automation" ADD COLUMN "publicReplyEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Automation" ADD COLUMN "publicReplyText" TEXT;
ALTER TABLE "Automation" ADD COLUMN "minDelaySeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Automation" ADD COLUMN "maxDelaySeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Automation" ADD COLUMN "followNudgeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Automation" ADD COLUMN "followNudgeMessage" TEXT;
ALTER TABLE "Automation" ADD COLUMN "quickReplies" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Automation" ADD COLUMN "autoTag" TEXT;
ALTER TABLE "Automation" ADD COLUMN "hideKeywords" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Automation" ADD COLUMN "abTestEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Automation" ADD COLUMN "dmMessageVariantB" TEXT;
ALTER TABLE "Automation" ADD COLUMN "storyTriggerEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ─── 4. DmLog: A/B variant, tags, nudge expiry ───────────────────────────────
ALTER TABLE "DmLog" ADD COLUMN "variant" TEXT;
ALTER TABLE "DmLog" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "DmLog" ADD COLUMN "nudgeExpiresAt" TIMESTAMPTZ(3);

-- ─── 4b. LinkClick: A/B variant attribution ─────────────────────────────────
ALTER TABLE "LinkClick" ADD COLUMN "variant" TEXT;

-- ─── 5. SequenceStep ────────────────────────────────────────────────────────
CREATE TABLE "SequenceStep" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "delayMinutes" INTEGER NOT NULL DEFAULT 60,
  "message" TEXT NOT NULL,
  "quickReplies" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SequenceStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SequenceStep_automationId_stepOrder_key"
  ON "SequenceStep"("automationId", "stepOrder");
CREATE INDEX "SequenceStep_automationId_idx" ON "SequenceStep"("automationId");

ALTER TABLE "SequenceStep" ADD CONSTRAINT "SequenceStep_automationId_fkey"
  FOREIGN KEY ("automationId") REFERENCES "Automation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 6. SequenceDelivery ────────────────────────────────────────────────────
CREATE TABLE "SequenceDelivery" (
  "id" TEXT NOT NULL,
  "dmLogId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "status" "DmStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMPTZ(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SequenceDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SequenceDelivery_dmLogId_stepOrder_key"
  ON "SequenceDelivery"("dmLogId", "stepOrder");
CREATE INDEX "SequenceDelivery_dmLogId_idx" ON "SequenceDelivery"("dmLogId");

ALTER TABLE "SequenceDelivery" ADD CONSTRAINT "SequenceDelivery_dmLogId_fkey"
  FOREIGN KEY ("dmLogId") REFERENCES "DmLog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 7. InboundMessage (24h window tracking for sequences/broadcasts/nudge) ──
CREATE TABLE "InboundMessage" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "instagramAccountId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderName" TEXT,
  "messageText" TEXT,
  "mid" TEXT,
  "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboundMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InboundMessage_mid_key" ON "InboundMessage"("mid");
CREATE INDEX "InboundMessage_instagramAccountId_senderId_receivedAt_idx"
  ON "InboundMessage"("instagramAccountId", "senderId", "receivedAt");
CREATE INDEX "InboundMessage_workspaceId_idx" ON "InboundMessage"("workspaceId");

ALTER TABLE "InboundMessage" ADD CONSTRAINT "InboundMessage_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InboundMessage" ADD CONSTRAINT "InboundMessage_instagramAccountId_fkey"
  FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 8. Tag ─────────────────────────────────────────────────────────────────
CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");
CREATE INDEX "Tag_workspaceId_idx" ON "Tag"("workspaceId");

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 9. Broadcast ───────────────────────────────────────────────────────────
CREATE TABLE "Broadcast" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "instagramAccountId" TEXT NOT NULL,
  "name" TEXT,
  "message" TEXT NOT NULL,
  "quickReplies" TEXT[] NOT NULL DEFAULT '{}',
  "scheduledAt" TIMESTAMPTZ(3),
  "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Broadcast_workspaceId_idx" ON "Broadcast"("workspaceId");
CREATE INDEX "Broadcast_instagramAccountId_idx" ON "Broadcast"("instagramAccountId");
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_instagramAccountId_fkey"
  FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
