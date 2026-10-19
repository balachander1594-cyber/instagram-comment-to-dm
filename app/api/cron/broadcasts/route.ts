/**
 * Broadcast scheduler cron.
 *
 * Finds SCHEDULED broadcasts whose scheduledAt has passed and enqueues them.
 * NOTE: the coordinator must add this path to vercel.json crons.
 */
import { NextRequest, NextResponse } from "next/server";
import { dbx } from "@/lib/db/extended";
import { enqueueBroadcast } from "@/lib/broadcasts";

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const due = await dbx.broadcast.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const results: Array<{
    broadcastId: string;
    status: "started" | "failed";
    recipientCount?: number;
    error?: string;
  }> = [];

  for (const broadcast of due) {
    try {
      const { recipientCount } = await enqueueBroadcast(broadcast.id);
      results.push({
        broadcastId: broadcast.id,
        status: "started",
        recipientCount,
      });
    } catch (error) {
      results.push({
        broadcastId: broadcast.id,
        status: "failed",
        error: formatError(error),
      });
    }
  }

  const started = results.filter((r) => r.status === "started").length;

  return NextResponse.json({
    success: true,
    data: { started, results },
  });
}
