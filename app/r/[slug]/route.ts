import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { dbx } from "@/lib/db/extended";
import { getRequestIp, hashClickIp } from "@/lib/tracking/server";

type RedirectRouteProps = {
  params: Promise<{ slug: string }>;
};

/** Reads the A/B variant from the tracked URL (?v=A / ?v=B). Works with both
 *  NextRequest and plain Request (tests) by parsing request.url directly. */
function getVariantParam(request: NextRequest): string | null {
  const v = new URL(request.url).searchParams.get("v");
  return v === "A" || v === "B" ? v : null;
}

export async function GET(request: NextRequest, { params }: RedirectRouteProps) {
  const { slug } = await params;
  const trackedLink = await prisma.trackedLink.findUnique({
    where: { slug },
    select: {
      id: true,
      workspaceId: true,
      automationId: true,
      destinationUrl: true,
      automation: {
        select: {
          instagramAccountId: true,
        },
      },
    },
  });

  if (!trackedLink) {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }

  await dbx.linkClick.create({
    data: {
      workspaceId: trackedLink.workspaceId,
      automationId: trackedLink.automationId,
      instagramAccountId: trackedLink.automation.instagramAccountId,
      trackedLinkId: trackedLink.id,
      // A/B variant carried on the tracked URL as ?v=A / ?v=B.
      variant: getVariantParam(request),
      ipHash: hashClickIp(getRequestIp(request)),
      userAgent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    },
  });

  return NextResponse.redirect(trackedLink.destinationUrl, { status: 302 });
}
