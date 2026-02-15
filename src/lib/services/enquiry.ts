import { createService } from "@/lib/api/create-service";
import type { Enquiry, EnquiryStatusType } from "@/types/enquiry";

export const enquiryService = createService<Enquiry>("enquiry", {
  primaryKey: "id",
});

export const enquiryStatusTypeService = createService<EnquiryStatusType>(
  "enquiry_status_type",
  { primaryKey: "id" },
);
