import { createClient } from "@/lib/supabase/server";
import UpdateProfile from "@/components/UpdateProfile";
import UpdatePassword from "@/components/UpdatePassword";

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
  <UpdateProfile userId={user.id} profile={profile} />
  <UpdatePassword user={user}/>


</>
)
}
