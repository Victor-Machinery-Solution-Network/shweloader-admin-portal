import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getFeedback } from "@/lib/cache";
import { FeedbackClient } from "@/components/features/feedback/feedback-client";

export const metadata = {
  title: "Feedback",
  description: "View feedback submitted from the mobile app",
};

export default function FeedbackPage() {
  return (
    <>
      <PageHeader
        title="Feedback"
        description="View feedback submitted from the mobile app"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="feedback">
          <FeedbackContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function FeedbackContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.FEEDBACK);

  const feedback = await getFeedback();

  return <FeedbackClient feedback={feedback} />;
}
