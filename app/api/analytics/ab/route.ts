/**
 * A/B Analytics API — Phase 2.
 *
 * GET /api/analytics/ab?automationId=
 *   Per-variant stats: DMs sent and tracked-link clicks for variants A, B,
 *   and "none" (no variant). Auth: workspace member + automation ownership.
 */
import { NextRequest, NextResponse } from "next/server";
import { dbx, type AnyArgs } from "@/lib/db/extended";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type VariantKey = "A" | "B" | "none";

interface VariantStats {
  variant: VariantKey;
  sent: number;
  clicks: number;
  ctr: number;
}

interface GroupedRow {
  variant: string | null;
  _count: { _all: number };
}

function toVariantKey(variant: string | null): VariantKey {
  return variant === "A" || variant === "B" ? variant : "none";
}

export async function GET(request: NextRequest) {
  const ctx = await getCurrentWorkspaceContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const automationId = request.nextUrl.searchParams.get("automationId");
  if (!automationId) {
    return NextResponse.json(
      { success: false, error: "automationId is required" },
      { status: 400 }
    );
  }

  const automation = await dbx.automation.findFirst({
    where: { id: automationId, workspaceId: ctx.workspaceId },
    select: { id: true, name: true },
  });
  if (!automation) {
    return NextResponse.json(
      { success: false, error: "Automation not found" },
      { status: 404 }
    );
  }

  // groupBy on dbx returns AnyArgs[] — cast to a known shape.
  const [sentRows, clickRows] = await Promise.all([
    dbx.dmLog.groupBy({
      by: ["variant"],
      where: { automationId, status: "SENT" },
      _count: { _all: true },
    }) as Promise<unknown>,
    dbx.linkClick.groupBy({
      by: ["variant"],
      where: { automationId },
      _count: { _all: true },
    }) as Promise<unknown>,
  ]);

  const sentByVariant = new Map<VariantKey, number>();
  for (const row of (sentRows as AnyArgs[]).map((r) => r as unknown as GroupedRow)) {
    sentByVariant.set(toVariantKey(row.variant), row._count._all);
  }

  const clicksByVariant = new Map<VariantKey, number>();
  for (const row of (clickRows as AnyArgs[]).map((r) => r as unknown as GroupedRow)) {
    clicksByVariant.set(toVariantKey(row.variant), row._count._all);
  }

  const variants: VariantKey[] = ["A", "B", "none"];
  const results: VariantStats[] = variants.map((variant) => {
    const sent = sentByVariant.get(variant) ?? 0;
    const clicks = clicksByVariant.get(variant) ?? 0;
    return {
      variant,
      sent,
      clicks,
      ctr: sent > 0 ? Math.round((clicks / sent) * 1000) / 10 : 0,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      automationId,
      automationName: automation.name,
      variants: results,
    },
  });
}
