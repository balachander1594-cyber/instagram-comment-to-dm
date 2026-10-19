import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPrisma,
  mockSendPrivateReply,
  mockSendDirectMessage,
  mockReplyToCommentPublicly,
  mockDecryptToken,
  mockMatchKeywords,
  mockReserveDMSlot,
  mockQueueAdd,
  mockReserveWorkspaceDMSend,
  mockReleaseWorkspaceDMReservation,
  mockScheduleSequenceSteps,
  mockTryHandleSequenceJob,
  mockTryHandleBroadcastJob,
  mockMaybeHideSpam,
  mockMaybeHandleStoryTrigger,
} = vi.hoisted(() => ({
  mockPrisma: {
    automation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    dmLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    inboundMessage: {
      upsert: vi.fn(),
    },
    instagramAccount: {
      findUnique: vi.fn(),
    },
    operationalEvent: {
      create: vi.fn(),
    },
  },
  mockSendPrivateReply: vi.fn(),
  mockSendDirectMessage: vi.fn(),
  mockReplyToCommentPublicly: vi.fn(),
  mockDecryptToken: vi.fn(),
  mockMatchKeywords: vi.fn(),
  mockReserveDMSlot: vi.fn(),
  mockQueueAdd: vi.fn(),
  mockReserveWorkspaceDMSend: vi.fn(),
  mockReleaseWorkspaceDMReservation: vi.fn(),
  mockScheduleSequenceSteps: vi.fn(),
  mockTryHandleSequenceJob: vi.fn(),
  mockTryHandleBroadcastJob: vi.fn(),
  mockMaybeHideSpam: vi.fn(),
  mockMaybeHandleStoryTrigger: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/meta/client", () => ({
  sendPrivateReply: mockSendPrivateReply,
  sendDirectMessage: mockSendDirectMessage,
  replyToCommentPublicly: mockReplyToCommentPublicly,
  hideComment: vi.fn(),
  MetaApiError: class MetaApiError extends Error {
    code: number;
    constructor(
      code: number,
      _subcode: number | undefined,
      _fbTraceId: string | undefined,
      message: string
    ) {
      super(message);
      this.code = code;
      this.name = "MetaApiError";
    }
  },
}));

vi.mock("@/lib/meta/oauth", () => ({
  decryptToken: mockDecryptToken,
}));

vi.mock("@/lib/utils/keyword-matcher", () => ({
  matchKeywords: mockMatchKeywords,
}));

vi.mock("@/lib/utils/rate-limiter", () => ({
  reserveDMSlot: mockReserveDMSlot,
}));

vi.mock("@/lib/billing/usage", () => ({
  reserveWorkspaceDMSend: mockReserveWorkspaceDMSend,
  releaseWorkspaceDMReservation: mockReleaseWorkspaceDMReservation,
}));

vi.mock("@/lib/ops/worker-health", () => ({
  recordWorkerAlert: vi.fn(),
}));

vi.mock("@/lib/sequences", () => ({
  scheduleSequenceSteps: mockScheduleSequenceSteps,
}));

vi.mock("@/lib/queue/sequence-jobs", () => ({
  tryHandleSequenceJob: mockTryHandleSequenceJob,
}));

vi.mock("@/lib/queue/broadcast-jobs", () => ({
  tryHandleBroadcastJob: mockTryHandleBroadcastJob,
}));

vi.mock("@/lib/spam", () => ({
  maybeHideSpam: mockMaybeHideSpam,
}));

vi.mock("@/lib/story", () => ({
  maybeHandleStoryTrigger: mockMaybeHandleStoryTrigger,
}));

vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({
    add: mockQueueAdd,
  }),
  getRedisConnection: vi.fn(),
}));

vi.mock("bullmq", () => {
  function MockWorker(_name: string, processor: unknown) {
    (global as Record<string, unknown>).__dmWorkerProcessor = processor;
    return {
      on: vi.fn(),
      close: vi.fn(),
    };
  }
  return {
    Worker: MockWorker,
  };
});

import { createDMWorker } from "../lib/queue/dm-worker";

const usagePeriodStart = new Date("2026-05-01T00:00:00.000Z");

const mockAutomation = {
  id: "auto_789",
  workspaceId: "workspace_123",
  instagramAccountId: "ig_account_row_1",
  postId: "media_101",
  keywords: ["LINK", "PRICE"],
  excludedKeywords: [],
  dmMessage: "Hey {username}! Here is the link: https://example.com",
  isActive: true,
  wholeWordMatch: true,
  minDelaySeconds: 0,
  maxDelaySeconds: 0,
  followNudgeEnabled: false,
  followNudgeMessage: null,
  quickReplies: [],
  autoTag: null,
  hideKeywords: [],
  abTestEnabled: false,
  dmMessageVariantB: null,
  publicReplyEnabled: false,
  publicReplyText: null,
  storyTriggerEnabled: false,
  instagramAccount: {
    id: "ig_account_row_1",
    instagramId: "ig_456",
    accessToken: "encrypted_token_abc",
  },
  workspace: {
    id: "workspace_123",
  },
  trackedLinks: [],
};

const mockCommentJobData = {
  instagramAccountId: "ig_456",
  commentId: "comment_555",
  commentText: "I want the LINK!",
  commenterId: "commenter_999",
  commenterName: "commenter_user",
  mediaId: "media_101",
};

const mockDeliverJobData = {
  automationId: "auto_789",
  instagramAccountId: "ig_456",
  commentId: "comment_555",
  commentText: "I want the LINK!",
  commenterId: "commenter_999",
  commenterName: "commenter_user",
  mediaId: "media_101",
};

const mockInboundJobData = {
  instagramAccountId: "ig_456",
  senderId: "commenter_999",
  senderName: "commenter_user",
  text: "DONE",
  timestamp: Date.now(),
  isStoryReply: false,
  mid: "mid_001",
};

function getProcessor(): (job: {
  name: string;
  data: Record<string, unknown>;
  id: string;
  attemptsMade: number;
}) => Promise<void> {
  createDMWorker();
  return (global as Record<string, unknown>).__dmWorkerProcessor as (job: {
    name: string;
    data: Record<string, unknown>;
    id: string;
    attemptsMade: number;
  }) => Promise<void>;
}

function createMockJob(name: string, data: Record<string, unknown>) {
  return {
    name,
    data,
    id: "job_001",
    attemptsMade: 0,
  };
}

function mockSuccessfulReservations() {
  mockReserveWorkspaceDMSend.mockResolvedValue({
    allowed: true,
    reserved: true,
    remaining: 100,
    limit: 2000,
    periodStart: usagePeriodStart,
  });
  mockReserveDMSlot.mockResolvedValue({
    allowed: true,
    currentCount: 11,
    remainingDMs: 179,
    shouldRequeue: false,
    requeueDelayMs: 0,
    shouldSkip: false,
    reserved: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.automation.findMany.mockResolvedValue([mockAutomation]);
  mockPrisma.automation.findUnique.mockResolvedValue(mockAutomation);
  mockPrisma.dmLog.findUnique.mockResolvedValue(null);
  mockPrisma.dmLog.findFirst.mockResolvedValue(null);
  mockPrisma.dmLog.upsert.mockResolvedValue({});
  mockPrisma.dmLog.update.mockResolvedValue({});
  mockPrisma.dmLog.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.inboundMessage.upsert.mockResolvedValue({});
  mockPrisma.instagramAccount.findUnique.mockResolvedValue({
    workspaceId: "workspace_123",
  });
  mockPrisma.operationalEvent.create.mockResolvedValue({});
  mockDecryptToken.mockReturnValue("decrypted_token");
  // Excluded-keyword call gets [], keyword call gets ["LINK", "PRICE"].
  mockMatchKeywords.mockImplementation(
    (_text: string, keywords: string[]) =>
      keywords.length > 0
        ? { matched: true, matchedKeyword: keywords[0] }
        : { matched: false, matchedKeyword: null }
  );
  mockSuccessfulReservations();
  mockReleaseWorkspaceDMReservation.mockResolvedValue({ count: 1 });
  mockSendPrivateReply.mockResolvedValue({
    recipient_id: "commenter_999",
    message_id: "msg_001",
  });
  mockSendDirectMessage.mockResolvedValue({
    recipient_id: "commenter_999",
    message_id: "msg_002",
  });
  mockReplyToCommentPublicly.mockResolvedValue({ id: "reply_001" });
  mockScheduleSequenceSteps.mockResolvedValue(undefined);
  mockTryHandleSequenceJob.mockResolvedValue(false);
  mockTryHandleBroadcastJob.mockResolvedValue(false);
  mockMaybeHideSpam.mockResolvedValue(false);
  mockMaybeHandleStoryTrigger.mockResolvedValue(undefined);
});

describe("DM Worker — process-comment (match phase)", () => {
  it("should enqueue a deliver-dm job for a matching comment", async () => {
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockPrisma.automation.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        instagramAccount: { instagramId: "ig_456" },
        OR: [{ postId: "media_101" }, { postId: null }],
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
    // First call = excluded keywords, second = campaign keywords.
    expect(mockMatchKeywords).toHaveBeenNthCalledWith(1, "I want the LINK!", [], true);
    expect(mockMatchKeywords).toHaveBeenNthCalledWith(
      2,
      "I want the LINK!",
      ["LINK", "PRICE"],
      true
    );
    expect(mockMaybeHideSpam).toHaveBeenCalledWith({
      automation: {
        hideKeywords: [],
        wholeWordMatch: true,
        workspaceId: "workspace_123",
      },
      commentId: "comment_555",
      commentText: "I want the LINK!",
      accessToken: "decrypted_token",
    });
    expect(mockPrisma.dmLog.upsert).toHaveBeenCalledWith({
      where: {
        automationId_commentId: {
          automationId: "auto_789",
          commentId: "comment_555",
        },
      },
      create: expect.objectContaining({
        status: "PENDING",
        variant: null,
        tags: [],
        nudgeExpiresAt: null,
      }),
      update: expect.objectContaining({
        status: "PENDING",
        variant: null,
        tags: [],
        nudgeExpiresAt: null,
      }),
    });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "deliver-dm",
      {
        automationId: "auto_789",
        instagramAccountId: "ig_456",
        commentId: "comment_555",
        commentText: "I want the LINK!",
        commenterId: "commenter_999",
        commenterName: "commenter_user",
        mediaId: "media_101",
      },
      {
        delay: 0,
        jobId: "dm:auto_789:comment_555",
      }
    );
    // Match phase never sends.
    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockReserveWorkspaceDMSend).not.toHaveBeenCalled();
  });

  it("should apply the smart delay when min/max delays are set", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      { ...mockAutomation, minDelaySeconds: 60, maxDelaySeconds: 120 },
    ]);
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    const addCall = mockQueueAdd.mock.calls.find(
      (call) => call[0] === "deliver-dm"
    );
    expect(addCall).toBeDefined();
    const delay = (addCall![2] as { delay: number }).delay;
    expect(delay).toBeGreaterThanOrEqual(60 * 1000);
    expect(delay).toBeLessThanOrEqual(120 * 1000);
  });

  it("should record nudge metadata when follow nudge is enabled", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      { ...mockAutomation, followNudgeEnabled: true },
    ]);
    const processor = getProcessor();
    const before = Date.now();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    const upsertCall = mockPrisma.dmLog.upsert.mock.calls[0][0] as {
      create: { nudgeExpiresAt: Date };
    };
    const expiresAt = upsertCall.create.nudgeExpiresAt;
    expect(expiresAt).toBeInstanceOf(Date);
    const delta = expiresAt.getTime() - before;
    expect(delta).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 5000);
    expect(delta).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 5000);
  });

  it("should record the auto-tag on the dm log", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      { ...mockAutomation, autoTag: "diwali-offer" },
    ]);
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockPrisma.dmLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ tags: ["diwali-offer"] }),
      })
    );
  });

  it("should skip silently when excluded keywords match", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      { ...mockAutomation, excludedKeywords: ["SPAM"] },
    ]);
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockPrisma.dmLog.upsert).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
    expect(mockSendPrivateReply).not.toHaveBeenCalled();
  });

  it("should skip via maybeHideSpam without a DM", async () => {
    mockMaybeHideSpam.mockResolvedValue(true);
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockPrisma.dmLog.upsert).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("should skip when no automations match the media", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([]);
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockPrisma.dmLog.upsert).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("should skip when keywords do not match", async () => {
    mockMatchKeywords.mockReturnValue({ matched: false, matchedKeyword: null });
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockReserveWorkspaceDMSend).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("should skip duplicate comments already sent", async () => {
    mockPrisma.dmLog.findUnique.mockResolvedValue({
      id: "existing_log",
      status: "SENT",
    });
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockReserveWorkspaceDMSend).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("should handle missing access token", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      {
        ...mockAutomation,
        instagramAccount: {
          ...mockAutomation.instagramAccount,
          accessToken: null,
        },
      },
    ]);

    const processor = getProcessor();
    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockPrisma.dmLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: "FAILED",
          errorMessage: "No Instagram access token available",
        }),
      })
    );
    expect(mockReserveWorkspaceDMSend).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("should handle decrypt failure", async () => {
    mockDecryptToken.mockImplementation(() => {
      throw new Error("decrypt failed");
    });
    const processor = getProcessor();

    await processor(createMockJob("process-comment", { ...mockCommentJobData }));

    expect(mockPrisma.dmLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Failed to decrypt Instagram access token",
        }),
      })
    );
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});

describe("DM Worker — deliver-dm (send phase)", () => {
  function mockPendingLog(overrides: Record<string, unknown> = {}) {
    mockPrisma.dmLog.findUnique.mockResolvedValue({
      id: "dmlog_1",
      automationId: "auto_789",
      commentId: "comment_555",
      status: "PENDING",
      variant: null,
      attempts: 1,
      ...overrides,
    });
  }

  it("should send a private reply for a pending deliver-dm job", async () => {
    mockPendingLog();
    const processor = getProcessor();

    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockReserveWorkspaceDMSend).toHaveBeenCalledWith("workspace_123");
    expect(mockReserveDMSlot).toHaveBeenCalledWith("ig_456", 0);
    expect(mockSendPrivateReply).toHaveBeenCalledWith(
      "decrypted_token",
      "ig_456",
      "comment_555",
      "Hey commenter_user! Here is the link: https://example.com"
    );
    expect(mockReleaseWorkspaceDMReservation).not.toHaveBeenCalled();
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith({
      where: {
        automationId_commentId: {
          automationId: "auto_789",
          commentId: "comment_555",
        },
      },
      data: expect.objectContaining({ status: "SENT" }),
    });
    expect(mockScheduleSequenceSteps).toHaveBeenCalledWith("dmlog_1");
  });

  it("should skip when the dm log is not PENDING", async () => {
    mockPrisma.dmLog.findUnique.mockResolvedValue({
      id: "dmlog_1",
      status: "SENT",
    });
    const processor = getProcessor();

    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockReserveWorkspaceDMSend).not.toHaveBeenCalled();
  });

  it("should skip when monthly plan limit is reached", async () => {
    mockPendingLog();
    mockReserveWorkspaceDMSend.mockResolvedValue({
      allowed: false,
      reserved: false,
      remaining: 0,
      limit: 100,
      periodStart: usagePeriodStart,
    });

    const processor = getProcessor();
    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockReserveDMSlot).not.toHaveBeenCalled();
    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SKIPPED_PLAN_LIMIT" }),
      })
    );
  });

  it("should requeue and release monthly usage when rate limited", async () => {
    mockPendingLog();
    mockReserveDMSlot.mockResolvedValue({
      allowed: false,
      currentCount: 190,
      remainingDMs: 0,
      shouldRequeue: true,
      requeueDelayMs: 1800000,
      shouldSkip: false,
      reserved: false,
    });

    const processor = getProcessor();
    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockReleaseWorkspaceDMReservation).toHaveBeenCalledWith(
      "workspace_123",
      usagePeriodStart
    );
    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "deliver-dm",
      expect.objectContaining({
        commentId: "comment_555",
        requeueAttempt: 1,
      }),
      expect.objectContaining({
        delay: 1800000,
        jobId: "dm:auto_789:comment_555:retry:1",
      })
    );
  });

  it("should skip with SKIPPED_RATE_LIMIT after max requeue attempts", async () => {
    mockPendingLog();
    mockReserveDMSlot.mockResolvedValue({
      allowed: false,
      currentCount: 190,
      remainingDMs: 0,
      shouldRequeue: false,
      requeueDelayMs: 0,
      shouldSkip: true,
      reserved: false,
    });

    const processor = getProcessor();
    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockReleaseWorkspaceDMReservation).toHaveBeenCalledWith(
      "workspace_123",
      usagePeriodStart
    );
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SKIPPED_RATE_LIMIT" }),
      })
    );
    expect(mockSendPrivateReply).not.toHaveBeenCalled();
  });

  it("should log FAILED, release usage, and re-throw when private reply sending fails", async () => {
    mockPendingLog();
    const error = new Error("API Error");
    mockSendPrivateReply.mockRejectedValue(error);

    const processor = getProcessor();

    await expect(
      processor(createMockJob("deliver-dm", { ...mockDeliverJobData }))
    ).rejects.toThrow("API Error");
    expect(mockReleaseWorkspaceDMReservation).toHaveBeenCalledWith(
      "workspace_123",
      usagePeriodStart
    );
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith({
      where: {
        automationId_commentId: {
          automationId: "auto_789",
          commentId: "comment_555",
        },
      },
      data: expect.objectContaining({
        status: "FAILED",
        errorMessage: "API Error",
      }),
    });
  });

  it("should send the nudge message when follow nudge is enabled", async () => {
    mockPendingLog();
    mockPrisma.automation.findUnique.mockResolvedValue({
      ...mockAutomation,
      followNudgeEnabled: true,
      followNudgeMessage: null,
    });
    const processor = getProcessor();

    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockSendPrivateReply).toHaveBeenCalledWith(
      "decrypted_token",
      "ig_456",
      "comment_555",
      expect.stringContaining("Follow us and reply DONE")
    );
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "NUDGE_PENDING" }),
      })
    );
    expect(mockScheduleSequenceSteps).not.toHaveBeenCalled();
  });

  it("should use 'there' when commenter name is not available", async () => {
    mockPendingLog();
    const processor = getProcessor();
    const jobDataWithoutName = {
      ...mockDeliverJobData,
    };
    delete (jobDataWithoutName as Record<string, unknown>).commenterName;

    await processor(createMockJob("deliver-dm", jobDataWithoutName));

    expect(mockSendPrivateReply).toHaveBeenCalledWith(
      "decrypted_token",
      "ig_456",
      "comment_555",
      "Hey there! Here is the link: https://example.com"
    );
  });

  it("should render tracked links into private replies", async () => {
    mockPendingLog();
    mockPrisma.automation.findUnique.mockResolvedValue({
      ...mockAutomation,
      dmMessage: "Hey {username}! Here is the offer: {link}",
      trackedLinks: [
        {
          slug: "abc123",
          destinationUrl: "https://example.com",
        },
      ],
    });

    const processor = getProcessor();
    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockSendPrivateReply).toHaveBeenCalledWith(
      "decrypted_token",
      "ig_456",
      "comment_555",
      "Hey commenter_user! Here is the offer: http://localhost:3000/r/abc123"
    );
  });

  it("should send variant B when A/B is enabled and the log is variant B", async () => {
    mockPendingLog({ variant: "B" });
    mockPrisma.automation.findUnique.mockResolvedValue({
      ...mockAutomation,
      abTestEnabled: true,
      dmMessageVariantB: "Hey {username}! Variant B for you: https://example.com",
    });

    const processor = getProcessor();
    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockSendPrivateReply).toHaveBeenCalledWith(
      "decrypted_token",
      "ig_456",
      "comment_555",
      "Hey commenter_user! Variant B for you: https://example.com"
    );
  });

  it("should post a public reply when enabled, without blocking the DM on failure", async () => {
    mockPendingLog();
    mockPrisma.automation.findUnique.mockResolvedValue({
      ...mockAutomation,
      publicReplyEnabled: true,
      publicReplyText: "Sent you a DM, {username}! 📩",
    });
    mockReplyToCommentPublicly.mockRejectedValue(new Error("public failed"));

    const processor = getProcessor();
    await processor(createMockJob("deliver-dm", { ...mockDeliverJobData }));

    expect(mockReplyToCommentPublicly).toHaveBeenCalledWith(
      "decrypted_token",
      "comment_555",
      "Sent you a DM, commenter_user! 📩"
    );
    expect(mockSendPrivateReply).toHaveBeenCalled();
    expect(mockPrisma.operationalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ level: "WARNING" }),
      })
    );
  });
});

describe("DM Worker — process-inbound-message", () => {
  function mockNudgeScenario() {
    mockPrisma.instagramAccount.findUnique.mockResolvedValue({
      id: "ig_account_row_1",
      workspaceId: "workspace_123",
      accessToken: "encrypted_token_abc",
      instagramId: "ig_456",
    });
    mockPrisma.dmLog.findFirst.mockResolvedValue({
      id: "dmlog_nudge",
      automationId: "auto_789",
      commenterId: "commenter_999",
      commenterName: "commenter_user",
      status: "NUDGE_PENDING",
      variant: null,
      attempts: 1,
    });
    mockPrisma.automation.findUnique.mockResolvedValue({
      ...mockAutomation,
      quickReplies: ["Yes, send it"],
    });
  }

  it("should resolve a nudge by sending the link via the Send API", async () => {
    mockNudgeScenario();
    const processor = getProcessor();

    await processor(
      createMockJob("process-inbound-message", { ...mockInboundJobData })
    );

    expect(mockPrisma.inboundMessage.upsert).toHaveBeenCalledWith({
      where: { mid: "mid_001" },
      create: expect.objectContaining({
        senderId: "commenter_999",
        messageText: "DONE",
        mid: "mid_001",
      }),
      update: expect.objectContaining({
        messageText: "DONE",
      }),
    });
    // Expired-nudge sweep runs on every inbound message.
    expect(mockPrisma.dmLog.updateMany).toHaveBeenCalledWith({
      where: {
        instagramAccountId: "ig_account_row_1",
        status: "NUDGE_PENDING",
        nudgeExpiresAt: { lt: expect.any(Date) },
      },
      data: { status: "EXPIRED" },
    });
    expect(mockSendDirectMessage).toHaveBeenCalledWith(
      "decrypted_token",
      "ig_456",
      "commenter_999",
      "Hey commenter_user! Here is the link: https://example.com",
      ["Yes, send it"]
    );
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith({
      where: { id: "dmlog_nudge" },
      data: expect.objectContaining({ status: "SENT" }),
    });
    expect(mockScheduleSequenceSteps).toHaveBeenCalledWith("dmlog_nudge");
    expect(mockMaybeHandleStoryTrigger).not.toHaveBeenCalled();
  });

  it("should skip when the account is unknown", async () => {
    mockPrisma.instagramAccount.findUnique.mockResolvedValue(null);
    const processor = getProcessor();

    await processor(
      createMockJob("process-inbound-message", { ...mockInboundJobData })
    );

    expect(mockPrisma.inboundMessage.upsert).not.toHaveBeenCalled();
    expect(mockSendDirectMessage).not.toHaveBeenCalled();
  });

  it("should route story replies to the story trigger handler", async () => {
    mockNudgeScenario();
    mockPrisma.dmLog.findFirst.mockResolvedValue(null);
    const processor = getProcessor();

    await processor(
      createMockJob("process-inbound-message", {
        ...mockInboundJobData,
        isStoryReply: true,
        text: "love this!",
        mid: "mid_story_1",
      })
    );

    expect(mockMaybeHandleStoryTrigger).toHaveBeenCalledWith({
      instagramAccountId: "ig_456",
      senderId: "commenter_999",
      senderName: "commenter_user",
      text: "love this!",
      mid: "mid_story_1",
    });
    expect(mockSendDirectMessage).not.toHaveBeenCalled();
  });
});

describe("DM Worker — job routing", () => {
  it("should delegate to the sequence handler and return when handled", async () => {
    mockTryHandleSequenceJob.mockResolvedValue(true);
    const processor = getProcessor();

    await processor(
      createMockJob("send-sequence-step", { dmLogId: "x", stepOrder: 1 })
    );

    expect(mockTryHandleSequenceJob).toHaveBeenCalled();
    expect(mockTryHandleBroadcastJob).not.toHaveBeenCalled();
  });

  it("should throw for unknown job names", async () => {
    const processor = getProcessor();

    await expect(
      processor(createMockJob("not-a-real-job", {}))
    ).rejects.toThrow("Unknown job name: not-a-real-job");
  });
});
