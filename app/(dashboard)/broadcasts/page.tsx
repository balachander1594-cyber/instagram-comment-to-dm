"use client";

/**
 * Broadcasts Page
 *
 * Compose a broadcast DM (sent to everyone who messaged the account in the
 * last 24h — the open messaging window), schedule it, or send immediately.
 * Also lists all broadcasts with status, sent/total progress, and
 * Send now / Cancel / Delete actions.
 */

import { useEffect, useState } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";

interface BroadcastRow {
  id: string;
  name: string | null;
  message: string;
  quickReplies: string[];
  scheduledAt: string | null;
  status: string;
  sentCount: number;
  totalCount: number;
  createdAt: string;
  instagramAccount?: {
    id: string;
    username: string;
    instagramId: string;
  } | null;
}

const broadcastStatusStyles: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-400",
  SCHEDULED: "bg-warning/10 text-warning",
  SENDING: "bg-accent/10 text-accent",
  SENT: "bg-success/10 text-success",
  FAILED: "bg-error/10 text-error",
  CANCELLED: "bg-zinc-500/10 text-zinc-400",
};

function BroadcastStatusBadge({ status }: { status: string }) {
  const styles = broadcastStatusStyles[status] ?? broadcastStatusStyles.DRAFT;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}

export default function BroadcastsPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [message, setMessage] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>(["", "", ""]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function loadBroadcasts() {
    const res = await fetch("/api/broadcasts");
    const payload = await res.json();
    if (payload.success) {
      setBroadcasts(payload.data ?? []);
    } else {
      setError(payload.error ?? "Failed to load broadcasts");
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/stats");
        const payload = await res.json();
        if (payload.success) {
          const nextAccounts = payload.data.instagramAccounts ?? [];
          setAccounts(nextAccounts);
          setSelectedAccountId(
            payload.data.selectedInstagramAccountId ??
              nextAccounts[0]?.id ??
              ""
          );
        }
        await loadBroadcasts();
      } catch {
        setError("Failed to load broadcasts");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) {
      setRecipientCount(null);
      return;
    }
    let cancelled = false;
    async function loadPreview() {
      setPreviewLoading(true);
      try {
        const res = await fetch(
          `/api/broadcasts/preview?instagramAccountId=${encodeURIComponent(selectedAccountId)}`
        );
        const payload = await res.json();
        if (!cancelled && payload.success) {
          setRecipientCount(payload.data.recipientCount ?? 0);
        }
      } catch {
        if (!cancelled) setRecipientCount(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }
    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  function setQuickReply(index: number, value: string) {
    setQuickReplies((current) => {
      const next = [...current];
      next[index] = value.slice(0, 20);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !message.trim()) {
      setError("Pick an account and write the broadcast message");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId: selectedAccountId,
          name: name.trim() || null,
          message: message.trim(),
          quickReplies: quickReplies.map((q) => q.trim()).filter(Boolean),
          scheduledAt: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        }),
      });
      const payload = await res.json();
      if (payload.success) {
        setName("");
        setMessage("");
        setQuickReplies(["", "", ""]);
        setScheduledAt("");
        await loadBroadcasts();
      } else {
        setError(payload.error ?? "Failed to create broadcast");
      }
    } catch {
      setError("Failed to create broadcast");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(
    id: string,
    action: "send" | "cancel" | "delete"
  ) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/broadcasts?id=${encodeURIComponent(id)}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      const payload = await res.json();
      if (payload.success) {
        await loadBroadcasts();
      } else {
        setError(payload.error ?? `Failed to ${action} broadcast`);
      }
    } catch {
      setError(`Failed to ${action} broadcast`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-muted">Loading broadcasts…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Broadcasts</h1>
        <p className="mt-1 text-sm text-muted">
          Send a DM to everyone who messaged this account in the last 24 hours.
          Recipients outside the 24h window are skipped automatically — no cold
          DMs, ever.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      {/* Compose */}
      <form
        onSubmit={handleSubmit}
        className="glass rounded-xl p-6 space-y-6"
      >
        <h2 className="text-lg font-semibold text-foreground">
          New broadcast
        </h2>

        <div className="space-y-2">
          <p className="block text-sm font-medium text-foreground">
            Instagram Account <span className="text-error">*</span>
          </p>
          {accounts.length > 0 ? (
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeAll={false}
              label="Connected profile"
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
              Connect Instagram before sending a broadcast
            </div>
          )}
          <p className="text-xs text-muted">
            {previewLoading
              ? "Counting reachable people…"
              : recipientCount !== null
                ? `${recipientCount} ${recipientCount === 1 ? "person" : "people"} in the 24h window`
                : "Pick an account to see the recipient count"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Broadcast Name <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Diwali offer blast"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Message <span className="text-error">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey {username}! Quick heads-up…"
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-muted">
            Use{" "}
            <code className="px-1 py-0.5 rounded bg-surface-hover text-accent font-mono text-[11px]">
              {"{username}"}
            </code>{" "}
            to personalize · {message.length}/1000
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Quick Replies <span className="text-muted font-normal">(optional, up to 3)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickReplies.map((reply, index) => (
              <input
                key={index}
                type="text"
                value={reply}
                onChange={(e) => setQuickReply(index, e.target.value)}
                placeholder={`Reply ${index + 1}`}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors"
                maxLength={20}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Schedule <span className="text-muted font-normal">(optional — leave empty to keep as draft)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground focus:border-accent/40 focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? "Saving…" : "Save Broadcast"}
        </button>
      </form>

      {/* List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          All broadcasts
        </h2>
        {broadcasts.length === 0 ? (
          <div className="glass rounded-xl p-6 text-sm text-muted">
            No broadcasts yet. Compose one above — it stays a draft until you
            hit “Send now”.
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="glass rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {broadcast.name ?? "(untitled)"}
                    </p>
                    <p className="mt-1 text-sm text-muted line-clamp-2">
                      {broadcast.message}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      @{broadcast.instagramAccount?.username ?? "—"}
                      {broadcast.scheduledAt
                        ? ` · scheduled ${new Date(broadcast.scheduledAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <BroadcastStatusBadge status={broadcast.status} />
                </div>
                <div className="flex items-center justify-between gap-4 pt-1">
                  <p className="text-xs text-muted">
                    Sent {broadcast.sentCount}/{broadcast.totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    {(broadcast.status === "DRAFT" ||
                      broadcast.status === "SCHEDULED") && (
                      <button
                        type="button"
                        disabled={busyId === broadcast.id}
                        onClick={() => handleAction(broadcast.id, "send")}
                        className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {busyId === broadcast.id ? "Sending…" : "Send now"}
                      </button>
                    )}
                    {broadcast.status !== "SENT" &&
                      broadcast.status !== "CANCELLED" && (
                        <button
                          type="button"
                          disabled={busyId === broadcast.id}
                          onClick={() => handleAction(broadcast.id, "cancel")}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-foreground hover:border-border-hover transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    {(broadcast.status === "DRAFT" ||
                      broadcast.status === "CANCELLED") && (
                      <button
                        type="button"
                        disabled={busyId === broadcast.id}
                        onClick={() => handleAction(broadcast.id, "delete")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
