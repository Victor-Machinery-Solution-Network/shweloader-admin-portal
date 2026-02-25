import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherInstance;
}

/**
 * Trigger a notification event on a user's private channel.
 * Channel name: `private-user-{userId}`
 */
export async function triggerNotification(
  recipientId: number,
  eventName: string,
  data: Record<string, unknown>,
): Promise<void> {
  const pusher = getPusher();
  await pusher.trigger(`private-user-${recipientId}`, eventName, data);
}

/**
 * Trigger a notification event on multiple users' private channels.
 * Pusher batch trigger supports up to 10 channels per call.
 */
export async function triggerNotificationBatch(
  recipientIds: number[],
  eventName: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (recipientIds.length === 0) return;
  const pusher = getPusher();

  // Pusher batch supports up to 10 events per call
  const BATCH_SIZE = 10;
  const batches: Array<Array<{ channel: string; name: string; data: string }>> = [];
  const serialized = JSON.stringify(data);

  for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
    const slice = recipientIds.slice(i, i + BATCH_SIZE);
    batches.push(
      slice.map((id) => ({
        channel: `private-user-${id}`,
        name: eventName,
        data: serialized,
      })),
    );
  }

  await Promise.all(batches.map((batch) => pusher.triggerBatch(batch)));
}

/** Re-export for use in the auth endpoint */
export { getPusher };
