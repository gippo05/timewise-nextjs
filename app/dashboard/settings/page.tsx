import { UserRoundX } from "lucide-react";

import AvatarUploaderCard from "@/components/UploadAvatar";
import UpdatePassword from "@/components/UpdatePassword";
import UpdateProfile from "@/components/UpdateProfile";
import EmptyState from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(userError);
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in required"
        description="You need an active account session before profile and security settings can be updated."
        icon={UserRoundX}
      />
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(profileError);
  }

  const fallbackName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "Team member";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="min-w-0">
        <AvatarUploaderCard userId={user.id} fallbackName={fallbackName} />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <UpdateProfile userId={user.id} profile={profile} />
        <UpdatePassword userId={user.id} />
      </div>
    </div>
  );
}
