import { createHmac, timingSafeEqual } from "crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    throw new Error("FACEBOOK_APP_SECRET environment variable is required");
  }

  const expectedSignature =
    "sha256=" + createHmac("sha256", appSecret).update(payload).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export interface WebhookCommentEvent {
  instagramAccountId: string;
  commentId: string;
  commentText: string;
  commenterId: string;
  commenterName?: string;
  mediaId: string;
}

interface WebhookEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: string;
    value: {
      id?: string;
      comment_id?: string;
      text?: string;
      from?: {
        id?: string;
        username?: string;
      };
      media?: {
        id?: string;
      };
      media_id?: string;
    };
  }>;
}

interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export function parseCommentEvents(payload: WebhookPayload): WebhookCommentEvent[] {  const events: WebhookCommentEvent[] = [];

  if (payload.object !== "instagram") {
    return events;
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;

      const value = change.value;
      const commentId = value?.id ?? value?.comment_id;
      const mediaId = value?.media?.id ?? value?.media_id;
      const commenterId = value?.from?.id;

      if (!entry.id || !commentId || !mediaId || !commenterId) {
        continue;
      }

      events.push({
        instagramAccountId: entry.id,
        commentId,
        commentText: value.text ?? "",
        commenterId,
        commenterName: value.from?.username,
        mediaId,
      });
    }
  }

  return events;
}

export interface WebhookMessageEvent {
  instagramAccountId: string;
  senderId: string;
  senderName?: string;
  text?: string;
  timestamp: number;
  isStoryReply: boolean;
  mid: string;
}

interface WebhookMessaging {
  sender?: {
    id?: string;
    username?: string;
  };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    reply_to?: {
      story?: {
        id?: string;
      };
    };
  };
}

interface WebhookMessagingEntry {
  id: string;
  time: number;
  messaging?: WebhookMessaging[];
}

interface WebhookMessagingPayload {
  object: string;
  entry: WebhookMessagingEntry[];
}

export function parseMessageEvents(
  payload: WebhookMessagingPayload
): WebhookMessageEvent[] {
  const events: WebhookMessageEvent[] = [];

  if (payload.object !== "instagram") {
    return events;
  }

  for (const entry of payload.entry ?? []) {
    for (const item of entry.messaging ?? []) {
      const senderId = item.sender?.id;

      // Skip events with no sender, and own echoes (sender is the account).
      if (!senderId || senderId === entry.id) {
        continue;
      }

      const rawTimestamp =
        typeof item.timestamp === "number" ? item.timestamp : entry.time;
      // messaging[].timestamp is epoch ms; entry.time is epoch seconds.
      const timestamp =
        rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
      const message = item.message ?? {};

      events.push({
        instagramAccountId: entry.id,
        senderId,
        senderName: item.sender?.username,
        text: message.text,
        timestamp,
        isStoryReply: Boolean(message.reply_to?.story),
        mid: message.mid ?? `nomid:${senderId}:${timestamp}`,
      });
    }
  }

  return events;
}
