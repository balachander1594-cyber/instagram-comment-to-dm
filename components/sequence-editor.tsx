"use client";

/**
 * Sequence Step Editor — Phase 2.
 *
 * Contract (unchanged):
 *   props: { steps: SequenceStepInput[]; onChange: (steps: SequenceStepInput[]) => void; }
 *   SequenceStepInput = { stepOrder, delayMinutes, message, quickReplies: string[] }
 *
 * Full editor UI: add/remove/reorder steps, per-step delay, message,
 * quick replies (one per line, max 3). onChange emits steps with
 * stepOrder re-indexed from 1.
 */

export interface SequenceStepInput {
  stepOrder: number;
  delayMinutes: number;
  message: string;
  quickReplies: string[];
}

interface SequenceStepEditorProps {
  steps: SequenceStepInput[];
  onChange: (steps: SequenceStepInput[]) => void;
}

const MAX_MESSAGE_LENGTH = 1000;
const MAX_QUICK_REPLIES = 3;
const MAX_QUICK_REPLY_LENGTH = 20;
const MAX_DELAY_MINUTES = 10080;

function reindex(steps: SequenceStepInput[]): SequenceStepInput[] {
  return steps.map((step, index) => ({ ...step, stepOrder: index + 1 }));
}

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

export default function SequenceStepEditor({
  steps,
  onChange,
}: SequenceStepEditorProps) {
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  function emit(next: SequenceStepInput[]) {
    onChange(reindex(next));
  }

  function updateStep(index: number, patch: Partial<SequenceStepInput>) {
    emit(sorted.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function addStep() {
    emit([
      ...sorted,
      { stepOrder: sorted.length + 1, delayMinutes: 1440, message: "", quickReplies: [] },
    ]);
  }

  function removeStep(index: number) {
    emit(sorted.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  }

  function updateQuickReplies(index: number, raw: string) {
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, MAX_QUICK_REPLIES)
      .map((line) => line.slice(0, MAX_QUICK_REPLY_LENGTH));
    updateStep(index, { quickReplies: lines });
  }

  return (
    <div className="space-y-4">
      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-8 text-center">
          <p className="text-sm text-muted">
            No follow-up steps yet. Add one below — each step sends a DM after
            the delay you set, but only if the person replied within 24 hours.
          </p>
        </div>
      )}

      {sorted.map((step, index) => (
        <div
          key={step.stepOrder}
          className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Step {index + 1}
                </p>
                <p className="text-xs text-muted">
                  Sends {formatDelay(step.delayMinutes)} after the first DM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveStep(index, -1)}
                disabled={index === 0}
                title="Move up"
                className="rounded-lg p-1.5 text-muted transition-all hover:bg-surface-hover hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, 1)}
                disabled={index === sorted.length - 1}
                title="Move down"
                className="rounded-lg p-1.5 text-muted transition-all hover:bg-surface-hover hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeStep(index)}
                title="Remove step"
                className="rounded-lg p-1.5 text-muted transition-all hover:bg-red-500/10 hover:text-red-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Delay */}
          <div className="flex items-center gap-3">
            <label
              htmlFor={`seq-delay-${step.stepOrder}`}
              className="text-xs font-medium text-muted whitespace-nowrap"
            >
              Wait after first DM
            </label>
            <input
              id={`seq-delay-${step.stepOrder}`}
              type="number"
              min={0}
              max={MAX_DELAY_MINUTES}
              value={step.delayMinutes}
              onChange={(e) =>
                updateStep(index, {
                  delayMinutes: Math.max(
                    0,
                    Math.min(
                      MAX_DELAY_MINUTES,
                      Number.parseInt(e.target.value, 10) || 0
                    )
                  ),
                })
              }
              className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-muted">minutes</span>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label
              htmlFor={`seq-message-${step.stepOrder}`}
              className="text-xs font-medium text-muted"
            >
              Message <span className="text-zinc-500">(use {"{username}"} for their name)</span>
            </label>
            <textarea
              id={`seq-message-${step.stepOrder}`}
              value={step.message}
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => updateStep(index, { message: e.target.value })}
              placeholder="Hey {username}, just checking in — did you get a chance to look at the link?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-zinc-500 focus:border-accent focus:outline-none resize-y"
            />
            <p className="text-[11px] text-zinc-500 text-right">
              {step.message.length}/{MAX_MESSAGE_LENGTH}
            </p>
          </div>

          {/* Quick replies */}
          <div className="space-y-1.5">
            <label
              htmlFor={`seq-replies-${step.stepOrder}`}
              className="text-xs font-medium text-muted"
            >
              Quick replies{" "}
              <span className="text-zinc-500">
                (one per line, max {MAX_QUICK_REPLIES}, {MAX_QUICK_REPLY_LENGTH} chars each)
              </span>
            </label>
            <textarea
              id={`seq-replies-${step.stepOrder}`}
              value={step.quickReplies.join("\n")}
              rows={2}
              onChange={(e) => updateQuickReplies(index, e.target.value)}
              placeholder={"Yes, I'm interested\nTell me more"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-zinc-500 focus:border-accent focus:outline-none resize-y"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addStep}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition-all hover:border-accent/40 hover:text-accent"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add follow-up step
      </button>
    </div>
  );
}
