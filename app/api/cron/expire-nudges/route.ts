import { NextRequest, NextResponse } from "next/server";
import { dbx } from "@/lib/db/extended";

/**
 * GET /api/cron/expire-nudges
 *
 * Marks NUDGE_PENDING DmLogs whose nudge window has passed as EXPIRED.
 * Scheduled via vercel.json (every 6 hours).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await dbx.dmLog.updateMany({
    where: {
      status: "NUDGE_PENDING",
      nudgeExpiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ success: true, expired: result.count });
}
