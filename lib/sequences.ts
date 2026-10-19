/**
 * Sequence scheduling — Phase 2.
 *
 * scheduleSequenceSteps(dmLogId) loads the DM log, reads the automation's
 * SequenceSteps ordered by stepOrder, and enqueues one `send-sequence-step`
 * BullMQ job per step with delay = delayMinutes. No-op when the automation
 * has no steps.
 *
 * Called by Phase 1 after a DM reaches SENT.
 */
import type { Queue } from "bullmq";
import { dbx } from "@/lib/db/extended";
import { getDMQueue } from "@/lib/queue/client";
import type { SendSequenceStepJob } from "@/lib/queue/sequence-jobs";

export async function scheduleSequenceSteps(dmLogId: string): Promise<void> {
  const dmLog = await dbx.dmLog.findUnique({ where: { id: dmLogId } });
  if (!dmLog) return;

  const steps = await dbx.sequenceStep.findMany({
    where: { automationId: dmLog.automationId },
    orderBy: { stepOrder: "asc" },
  });
  if (steps.length === 0) return;

  const queue = getDMQueue() as unknown as Queue<SendSequenceStepJob>;
  for (const step of steps) {
    await queue.add(
      "send-sequence-step",
      { dmLogId, stepOrder: step.stepOrder },
      {
        delay: step.delayMinutes * 60 * 1000,
        jobId: `seq:${dmLogId}:${step.stepOrder}`,
      }
    );
  }
}
