/**
 * Status Badge
 *
 * Color-coded badge for DM status.
 */

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  SENT: { bg: "bg-success/10", text: "text-success", dot: "bg-success", label: "Sent" },
  FAILED: { bg: "bg-error/10", text: "text-error", dot: "bg-error", label: "Failed" },
  PENDING: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning", label: "Pending" },
  SKIPPED_DEDUP: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400", label: "Dedup" },
  SKIPPED_RATE_LIMIT: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning", label: "Rate Limited" },
  SKIPPED_PLAN_LIMIT: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning", label: "Plan Limit" },
  SKIPPED_NO_MATCH: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400", label: "No Match" },
  NUDGE_PENDING: { bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500", label: "Nudge Pending" },
  EXPIRED: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400", label: "Expired" },
  SKIPPED_WINDOW_CLOSED: { bg: "bg-orange-500/10", text: "text-orange-500", dot: "bg-orange-500", label: "Window Closed" },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.PENDING;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
