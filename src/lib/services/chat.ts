import { createService } from "@/lib/api/create-service";
import type { ChatSession, ChatMessage, ChatAttachment } from "@/types/chat";

export const chatSessionService = createService<ChatSession>("chat_session", {
  primaryKey: "id",
});

export const chatMessageService = createService<ChatMessage>("chat_message", {
  primaryKey: "id",
});

export const chatAttachmentService = createService<ChatAttachment>(
  "chat_attachment",
  { primaryKey: "id" },
);
