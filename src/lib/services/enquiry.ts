import { createService } from "@/lib/api/create-service";
import type { ChatEnquiry, EnquiryStatusType } from "@/types/enquiry";

export const chatEnquiryService = createService<ChatEnquiry>("chat_enquiry", {
  primaryKey: "id",
});

export const enquiryStatusTypeService = createService<EnquiryStatusType>(
  "enquiry_status_type",
  { primaryKey: "id" },
);
