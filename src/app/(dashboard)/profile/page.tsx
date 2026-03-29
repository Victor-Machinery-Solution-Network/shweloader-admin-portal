import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/features/profile/profile-form";

export const metadata = {
  title: "Profile",
  description: "Manage your profile settings",
};

export default function ProfilePage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Profile"
        description="Manage your account settings"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}
