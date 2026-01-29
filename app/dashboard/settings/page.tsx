import { createClient } from "@/lib/supabase/server";
import UpdateProfile from "@/components/UpdateProfile";
import UpdatePassword from "@/components/UpdatePassword";
import AvatarUploaderCard from "@/components/UploadAvatar";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
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
  <>




        <div className="px-5 pb-10">
  <div className="grid grid-cols-1 gap-12 lg:grid-cols-[400px_minmax(0,1fr)] items-start">
    {/* Left column */}
    <div className="min-w-0">
      <UpdateProfile userId={user.id} profile={profile} />
    </div>

    {/* Right column: Security + Avatar side-by-side */}
    <div className="min-w-0 grid lg:grid-cols-[minmax(500px,1fr)_500px] items-start">
  <div className="min-w-0">
    <UpdatePassword userId={user?.id ?? null} />
  </div>

  <div className="min-w-0">
    <AvatarUploaderCard userId={user.id} />
  </div>
</div>

  </div>
</div>




 


</>
)
}
