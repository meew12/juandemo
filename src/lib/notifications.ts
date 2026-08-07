import { createNotification as createNotificationDb } from "@/lib/db-raw";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    await createNotificationDb({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link || null,
    });
  } catch (err) {
    console.error("createNotification error:", err);
  }
}

export const NOTIFICATION_TYPES = {
  NEW_MESSAGE: "message",
  NEW_REVIEW: "review",
  BOOST_ACTIVATED: "boost",
  SUBSCRIPTION_ACTIVATED: "subscription",
  LISTING_APPROVED: "system",
  LISTING_REJECTED: "system",
  FAVORITE: "favorite",
  WELCOME: "system",
} as const;
