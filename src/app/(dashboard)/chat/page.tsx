import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getChatSessions } from "@/lib/cache";
import { ChatInbox } from "@/components/features/chat/chat-inbox";

export const metadata = {
  title: "Chat",
  description: "Real-time chat with users",
};

export default function ChatPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Chat"
        description="Real-time conversations with users"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="chat">
          <ChatContent />
        </PermissionGate>
      </Suspense>
    </div>
  );
}

async function ChatContent() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag(CACHE_TAGS.CHAT_SESSIONS);

  const sessions = await getChatSessions();
  return <ChatInbox sessions={sessions} />;
}
