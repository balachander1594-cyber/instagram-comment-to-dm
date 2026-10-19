/**
 * Tags API — Phase 2.
 *
 * GET  /api/tags — union of curated Tag rows + distinct dmLog.tags (workspace member)
 * POST /api/tags — upsert a Tag by name (workspace member)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbx } from "@/lib/db/extended";
import { getCurrentWorkspaceId } from "@/lib/auth";

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export async function GET(_request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const [curated, logRows] = await Promise.all([
    dbx.tag.findMany({
      where: { workspaceId },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    dbx.dmLog.findMany({
      where: { workspaceId },
      select: { tags: true },
    }),
  ]);

  const names = new Set<string>();
  for (const row of curated) names.add(row.name);
  for (const row of logRows) {
    for (const tag of row.tags ?? []) names.add(tag);
  }

  return NextResponse.json({
    success: true,
    data: { tags: [...names].sort() },
  });
}

export async function POST(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const parsed = createTagSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const tag = await dbx.tag.upsert({
    where: { workspaceId_name: { workspaceId, name: parsed.data.name } },
    create: { workspaceId, name: parsed.data.name },
    update: {},
  });

  return NextResponse.json({ success: true, data: { tag } });
}
