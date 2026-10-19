import { NextRequest, NextResponse } from "next/server";
import { dbx } from "@/lib/db/extended";
import { decryptToken } from "@/lib/meta/oauth";
import { getMediaComments } from "@/lib/meta/client";
import { getDMQueue } from "@/lib/queue/client";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

const BACKTRACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/automations/backtrack
 *
 * Re-processes comments on a post from the last 7 days through the
 * normal "process-comment" pipeline. Useful when a campaign was created
 * after comments were already left, or to catch missed comments.
 */
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
        error: "Only owners and admins can backtrack campaigns",
      },
      { status: 403 }
    );
  }

  const workspaceId = context.workspaceId;

  let body: { automationId?: string; postId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { automationId } = body;
  if (!automationId) {
    return NextResponse.json(
      { success: false, error: "Missing automationId" },
      { status: 400 }
    );
  }

  const automation = await dbx.automation.findFirst({
    where: { id: automationId, workspaceId },
    include: { instagramAccount: true },
  });

  if (!automation) {
    return NextResponse.json(
      { success: false, error: "Campaign not found" },
      { status: 404 }
    );
  }

  const targetPostId = body.postId ?? automation.postId;
  if (!targetPostId) {
    return NextResponse.json(
      { success: false, error: "Select a post — required for Backtrack" },
      { status: 400 }
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(automation.instagramAccount!.accessToken);
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to decrypt Instagram access token" },
      { status: 400 }
    );
  }

  const cutoff = Date.now() - BACKTRACK_WINDOW_MS;
  const comments = await getMediaComments(accessToken, targetPostId);

  const queue = getDMQueue();
  let enqueued = 0;

  for (const comment of comments) {
    const timestamp = new Date(comment.timestamp).getTime();
    if (Number.isNaN(timestamp) || timestamp < cutoff) {
      continue;
    }

    await queue.add(
      "process-comment",
      {
        instagramAccountId: automation.instagramAccount!.instagramId,
        commentId: comment.id,
        commentText: comment.text,
        commenterId: comment.from.id,
        commenterName: comment.from.username,
        mediaId: targetPostId,
        source: "backtrack",
      },
      {
        jobId: `comment:${automation.instagramAccount!.instagramId}:${comment.id}:backtrack`,
      }
    );
    enqueued++;
  }

  return NextResponse.json({ success: true, enqueued });
}
