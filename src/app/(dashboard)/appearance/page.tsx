import { PageHeader } from "@/components/shared/page-header";
import { AppearanceForm } from "@/components/features/appearance/appearance-form";

export const metadata = {
  title: "Appearance",
  description: "Customize the look and feel of your admin portal",
};

export default function AppearancePage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Appearance"
        description="Customize colors and fonts for your portal"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <AppearanceForm />
        </div>
      </div>
    </div>
  );
}
