/**
 * Automation defaults shared between server and client code.
 */

/** Default message used for the follow-nudge DM (text only, no tracked link). */
export const DEFAULT_NUDGE_MESSAGE =
  "Hey {username}! Your link is ready 🎁 Follow us and reply DONE (or anything!) and I'll send it right over.";

/** How long a nudge stays resolvable after the nudge DM is sent. */
export const NUDGE_WINDOW_DAYS = 7;

export const NUDGE_WINDOW_MS = NUDGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
