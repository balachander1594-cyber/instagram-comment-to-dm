/**
 * Sequences API — Phase 2.
 *
 * GET    /api/sequences?automationId=   — list steps ordered (workspace member)
 * POST   /api/sequences                — replace-all steps (owner/admin)
 * DELETE /api/sequences?automationId=   — delete all steps (owner/admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbx } from "@/lib/db/extended";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

const sequenceStepSchema = z.object({
  stepOrder: z.number().int().min(1),
  delayMinutes: z.number().int().min(0).max(10080),
  message: z.string().min(1).max(1000),
  quickReplies: z
    .array(z.string().min(1).max(20))
    .max(3)
    .default([]),
});

const replaceBodySchema = z.object({
  automationId: z.string().min(1),
  steps: z.array(sequenceStepSchema).max(20),
});

async function getOwnedAutomation(
  workspaceId: string,
  automationId: string
) {
  const automation = await dbx.automation.findFirst({
    where: { id: automationId, workspaceId },
    select: { id: true },
  });
  return automation;
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

  const automation = await getOwnedAutomation(ctx.workspaceId, automationId);
  if (!automation) {
    return NextResponse.json(
      { success: false, error: "Automation not found" },
      { status: 404 }
    );
  }

  const steps = await dbx.sequenceStep.findMany({
    where: { automationId },
    orderBy: { stepOrder: "asc" },
  });

  return NextResponse.json({ success: true, data: { steps } });
}

export async function POST(request: NextRequest) {
  const ctx = await getCurrentWorkspaceContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (!canManageWorkspace(ctx.role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const parsed = replaceBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { automationId, steps } = parsed.data;
  const automation = await getOwnedAutomation(ctx.workspaceId, automationId);
  if (!automation) {
    return NextResponse.json(
      { success: false, error: "Automation not found" },
      { status: 404 }
    );
  }

  // Replace-all, re-indexed from 1 in the order submitted.
  const normalized = [...steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((step, index) => ({
      stepOrder: index + 1,
      delayMinutes: step.delayMinutes,
      message: step.message,
      quickReplies: step.quickReplies,
    }));

  await dbx.sequenceStep.deleteMany({ where: { automationId } });
  for (const step of normalized) {
    await dbx.sequenceStep.create({
      data: { automationId, ...step },
    });
  }

  const saved = await dbx.sequenceStep.findMany({
    where: { automationId },
    orderBy: { stepOrder: "asc" },
  });

  return NextResponse.json({ success: true, data: { steps: saved } });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getCurrentWorkspaceContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (!canManageWorkspace(ctx.role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const automationId = request.nextUrl.searchParams.get("automationId");
  if (!automationId) {
    return NextResponse.json(
      { success: false, error: "automationId is required" },
      { status: 400 }
    );
  }

  const automation = await getOwnedAutomation(ctx.workspaceId, automationId);
  if (!automation) {
    return NextResponse.json(
      { success: false, error: "Automation not found" },
      { status: 404 }
    );
  }

  const result = await dbx.sequenceStep.deleteMany({ where: { automationId } });

  return NextResponse.json({
    success: true,
    data: { deleted: result.count },
  });
}
