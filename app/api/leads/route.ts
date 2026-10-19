/**
 * Leads API — Phase 2.
 *
 * GET /api/leads?page=&limit=&tag=&automationId=&status=
 *   Paginated DM logs as "leads" (workspace member).
 * GET /api/leads?format=csv&tag=&automationId=&status=
 *   Full filtered export as text/csv.
 */
import { NextRequest, NextResponse } from "next/server";
import { dbx } from "@/lib/db/extended";
import { getCurrentWorkspaceId } from "@/lib/auth";

const LEAD_STATUSES = ["SENT", "FAILED", "PENDING"];

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const tag = searchParams.get("tag");
  const automationId = searchParams.get("automationId");
  const status = searchParams.get("status");
  const format = searchParams.get("format");

  const where: Record<string, unknown> = { workspaceId };
  if (tag && tag !== "all") where.tags = { has: tag };
  if (automationId && automationId !== "all") where.automationId = automationId;
  if (status && status !== "ALL" && LEAD_STATUSES.includes(status)) {
    where.status = status;
  }

  const include = {
    automation: { select: { name: true } },
    instagramAccount: { select: { username: true } },
  };

  if (format === "csv") {
    const leads = await dbx.dmLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include,
    });

    const header = ["date", "name", "username", "comment", "keyword", "variant", "tags", "status"];
    const lines = leads.map((lead) =>
      [
        lead.createdAt.toISOString(),
        lead.commenterName,
        lead.commenterName ? `@${lead.commenterName}` : lead.commenterId,
        lead.commentText,
        lead.matchedKeyword,
        lead.variant,
        (lead.tags ?? []).join(";"),
        lead.status,
      ]
        .map(csvEscape)
        .join(",")
    );

    return new NextResponse([header.join(","), ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leads.csv"',
      },
    });
  }

  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    dbx.dmLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include,
    }),
    dbx.dmLog.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}
