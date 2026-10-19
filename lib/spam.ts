/**
 * Spam auto-hide.
 *
 * Phase 1's worker calls maybeHideSpam per automation after keyword match.
 * Returns true when the comment matched hideKeywords and was hidden
 * (caller should then skip the DM for this automation). Logs an
 * OperationalEvent. Returns false otherwise.
 */
import { hideComment } from "@/lib/meta/client";
import { prisma } from "@/lib/db/client";
import { matchKeywords } from "@/lib/utils/keyword-matcher";

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function maybeHideSpam(args: {
  automation: {
    hideKeywords: string[];
    wholeWordMatch: boolean;
    workspaceId: string;
  };
  commentId: string;
  commentText: string;
  accessToken: string; // decrypted IG token
}): Promise<boolean> {
  const { automation, commentId, commentText, accessToken } = args;

  if (!automation.hideKeywords?.length) return false;

  const match = matchKeywords(
    commentText,
    automation.hideKeywords,
    automation.wholeWordMatch
  );
  if (!match.matched) return false;

  try {
    await hideComment(accessToken, commentId);
  } catch (error) {
    await prisma.operationalEvent
      .create({
        data: {
          workspaceId: automation.workspaceId,
          source: "WORKER",
          level: "WARNING",
          message: `Auto-hide failed for comment ${commentId}: ${formatError(error)}`,
          payload: {
            commentId,
            matchedKeyword: match.matchedKeyword,
          },
        },
      })
      .catch((recordError: unknown) => {
        console.error(
          "[spam] Failed to record auto-hide failure:",
          formatError(recordError)
        );
      });
    return false;
  }

  await prisma.operationalEvent
    .create({
      data: {
        workspaceId: automation.workspaceId,
        source: "WORKER",
        level: "INFO",
        message: `Auto-hid comment ${commentId} (matched spam keyword "${match.matchedKeyword}")`,
        payload: {
          commentId,
          matchedKeyword: match.matchedKeyword,
        },
      },
    })
    .catch((recordError: unknown) => {
      console.error(
        "[spam] Failed to record auto-hide:",
        formatError(recordError)
      );
    });

  return true;
}
