"use client";

/**
 * Leads Page — Phase 2.
 *
 * Paginated table of DM logs treated as leads, with tag + automation
 * filters and a CSV export button. Reuses the DM logs page patterns.
 */

import { useEffect, useState, useCallback } from "react";
import StatusBadge from "@/components/status-badge";

interface Lead {
  id: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  matchedKeyword: string | null;
  variant: string | null;
  tags: string[];
  status: string;
  createdAt: string;
  automation: { name: string };
  instagramAccount: { username: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AutomationOption {
  id: string;
  name: string;
}

const STATUS_FILTERS = ["ALL", "SENT", "PENDING", "FAILED"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [automations, setAutomations] = useState<AutomationOption[]>([]);
  const [tagFilter, setTagFilter] = useState("all");
  const [automationFilter, setAutomationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (tagFilter !== "all") params.set("tag", tagFilter);
      if (automationFilter !== "all") params.set("automationId", automationFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data.leads);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [page, tagFilter, automationFilter, statusFilter]);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setTags(payload.data.tags ?? []);
      })
      .catch(console.error);

    fetch("/api/automations")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) {
          setAutomations(
            (payload.data ?? []).map((a: { id: string; name: string }) => ({
              id: a.id,
              name: a.name,
            }))
          );
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLeads();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLeads]);

  function resetPage() {
    setLoading(true);
    setPage(1);
  }

  function buildCsvUrl() {
    const params = new URLSearchParams({ format: "csv" });
    if (tagFilter !== "all") params.set("tag", tagFilter);
    if (automationFilter !== "all") params.set("automationId", automationFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    return `/api/leads?${params}`;
  }

  const selectClass =
    "rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground focus:border-accent focus:outline-none";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                resetPage();
              }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  statusFilter === status
                    ? "bg-accent/15 text-accent border border-accent/20"
                    : "bg-surface text-muted border border-border hover:border-border-hover hover:text-foreground"
                }
              `}
            >
              {status === "ALL" ? "All" : status}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tagFilter}
            onChange={(e) => {
              setTagFilter(e.target.value);
              resetPage();
            }}
            className={selectClass}
            aria-label="Filter by tag"
          >
            <option value="all">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={automationFilter}
            onChange={(e) => {
              setAutomationFilter(e.target.value);
              resetPage();
            }}
            className={selectClass}
            aria-label="Filter by automation"
          >
            <option value="all">All automations</option>
            {automations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <a
            href={buildCsvUrl()}
            className="px-3 py-2 rounded-lg text-xs font-medium text-foreground bg-accent/15 border border-accent/20 hover:bg-accent/25 transition-all"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Lead</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Comment</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Keyword</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Variant</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Tags</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="h-4 bg-zinc-800/20 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No leads found
                  </td>
                </tr>
              )}
              {!loading &&
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">
                        @{lead.commenterName ?? lead.commenterId.slice(0, 8)}
                      </span>
                      <span className="block text-xs text-muted">
                        {lead.automation.name} · @{lead.instagramAccount.username}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <span className="text-muted truncate block">{lead.commentText}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-muted">{lead.matchedKeyword ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.variant ? (
                        <span className="inline-flex items-center rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                          {lead.variant}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-[160px]">
                      {lead.tags.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-md bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-muted border border-border"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4 text-muted whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage(page - 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Previous
              </button>
              <span className="text-xs text-muted px-2">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => {
                  setLoading(true);
                  setPage(page + 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
