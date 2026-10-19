/**
 * Broadcast recipient preview.
 *
 * GET ?instagramAccountId=<db id> → { recipientCount } — the number of
 * distinct senders inside the 24h messaging window for that account.
 */
import { NextRequest, NextResponse } from "next/server";
import { dbx } from "@/lib/db/extended";
import { getActiveRecipients } from "@/lib/broadcasts";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export async function GET(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const instagramAccountId = request.nextUrl.searchParams.get("instagramAccountId");
  if (!instagramAccountId) {
    return NextResponse.json(
      { success: false, error: "Missing instagramAccountId" },
      { status: 400 }
    );
  }

  const account = await dbx.instagramAccount.findFirst({
    where: { id: instagramAccountId, workspaceId: context.workspaceId },
  });
  if (!account) {
    return NextResponse.json(
      { success: false, error: "Instagram account not found" },
      { status: 404 }
    );
  }

  const recipients = await getActiveRecipients(account.id);

  return NextResponse.json({
    success: true,
    data: { recipientCount: recipients.length },
  });
}
