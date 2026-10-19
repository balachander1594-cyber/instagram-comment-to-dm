/**
 * Broadcasts API.
 *
 * GET    → list broadcasts for the workspace (newest first).
 * POST   → create a DRAFT (or SCHEDULED when scheduledAt is in the future).
 * PATCH  → ?id= { action: "send" | "cancel" }.
 * DELETE → ?id= delete (only DRAFT / CANCELLED).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbx } from "@/lib/db/extended";
import { enqueueBroadcast } from "@/lib/broadcasts";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

const createBroadcastSchema = z.object({
  instagramAccountId: z.string().min(1),
  name: z.string().max(100).optional().nullable(),
  message: z.string().min(1).max(1000),
  quickReplies: z.array(z.string().max(20)).max(3).default([]),
  scheduledAt: z.string().optional().nullable(),
});

const patchBroadcastSchema = z.object({
  action: z.enum(["send", "cancel"]),
});

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const broadcasts = await dbx.broadcast.findMany({
    where: { workspaceId: context.workspaceId },
    include: {
      instagramAccount: {
        select: { id: true, username: true, instagramId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: broadcasts });
}

export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      {
        success: false,
        error: "Only owners and admins can create broadcasts",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createBroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const account = await dbx.instagramAccount.findFirst({
    where: {
      id: parsed.data.instagramAccountId,
      workspaceId: context.workspaceId,
    },
  });
  if (!account) {
    return NextResponse.json(
      { success: false, error: "Instagram account not found" },
      { status: 404 }
    );
  }

  let scheduledAt: Date | null = null;
  if (parsed.data.scheduledAt) {
    scheduledAt = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid scheduledAt" },
        { status: 400 }
      );
    }
  }

  const broadcast = await dbx.broadcast.create({
    data: {
      workspaceId: context.workspaceId,
      instagramAccountId: account.id,
      name: parsed.data.name ?? null,
      message: parsed.data.message,
      quickReplies: parsed.data.quickReplies,
      scheduledAt,
      status:
        scheduledAt && scheduledAt.getTime() > Date.now()
          ? "SCHEDULED"
          : "DRAFT",
    },
  });

  return NextResponse.json(
    { success: true, data: broadcast },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      {
        success: false,
        error: "Only owners and admins can send broadcasts",
      },
      { status: 403 }
    );
  }

  const broadcastId = request.nextUrl.searchParams.get("id");
  if (!broadcastId) {
    return NextResponse.json(
      { success: false, error: "Missing broadcast ID" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = patchBroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const broadcast = await dbx.broadcast.findFirst({
    where: { id: broadcastId, workspaceId: context.workspaceId },
  });
  if (!broadcast) {
    return NextResponse.json(
      { success: false, error: "Broadcast not found" },
      { status: 404 }
    );
  }

  if (parsed.data.action === "send") {
    if (broadcast.status !== "DRAFT" && broadcast.status !== "SCHEDULED") {
      return NextResponse.json(
        {
          success: false,
          error: `Only DRAFT or SCHEDULED broadcasts can be sent (current: ${broadcast.status})`,
        },
        { status: 400 }
      );
    }
    try {
      const { recipientCount } = await enqueueBroadcast(broadcastId);
      return NextResponse.json({
        success: true,
        data: { recipientCount },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to send broadcast",
        },
        { status: 400 }
      );
    }
  }

  // action === "cancel"
  if (broadcast.status === "SENT") {
    return NextResponse.json(
      { success: false, error: "A SENT broadcast cannot be cancelled" },
      { status: 400 }
    );
  }

  const cancelled = await dbx.broadcast.update({
    where: { id: broadcastId },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true, data: cancelled });
}

export async function DELETE(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      {
        success: false,
        error: "Only owners and admins can delete broadcasts",
      },
      { status: 403 }
    );
  }

  const broadcastId = request.nextUrl.searchParams.get("id");
  if (!broadcastId) {
    return NextResponse.json(
      { success: false, error: "Missing broadcast ID" },
      { status: 400 }
    );
  }

  const broadcast = await dbx.broadcast.findFirst({
    where: { id: broadcastId, workspaceId: context.workspaceId },
  });
  if (!broadcast) {
    return NextResponse.json(
      { success: false, error: "Broadcast not found" },
      { status: 404 }
    );
  }

  if (broadcast.status !== "DRAFT" && broadcast.status !== "CANCELLED") {
    return NextResponse.json(
      {
        success: false,
        error: `Only DRAFT or CANCELLED broadcasts can be deleted (current: ${broadcast.status})`,
      },
      { status: 400 }
    );
  }

  await dbx.broadcast.delete({ where: { id: broadcastId } });

  return NextResponse.json({ success: true, data: { deleted: true } });
}
