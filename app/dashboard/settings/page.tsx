import { createClient } from "@/lib/supabase/server";
import UpdateProfile from "@/components/UpdateProfile";
import UpdatePassword from "@/components/UpdatePassword";
import AvatarUploaderCard from "@/components/UploadAvatar";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) console.error(userError);

  if (!user) {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Please log in</h2>
      </div>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  if (profileError) console.error(profileError);

  return (
  <div className="px-5 pb-10 w-full">
    {/* Header */}
    <div className="mb-8">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black">
        Settings
      </h1>
      <p className="mt-2 text-sm sm:text-base text-black/60">
        Manage your profile, security, and account preferences.
      </p>
    </div>

    {/* Layout */}
    <div className="grid grid-cols-1 gap-6 w-full">
      {/* Avatar full width */}
      <div className="w-full min-w-0">
        <AvatarUploaderCard userId={user.id} />
      </div>

      {/* Profile + Password full row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch w-full">
        <div className="w-full min-w-0 h-full">
          <UpdateProfile userId={user.id} profile={profile} />
        </div>

        <div className="w-full min-w-0 h-full">
          <UpdatePassword userId={user.id} />
        </div>
      </div>
    </div>
  </div>
  );
}
