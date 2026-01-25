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

  <div className="px-5 pb-10">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)] items-stretch">
  
                <div className="min-w-0 h-full">
                  <UpdateProfile userId={user.id} profile={profile}/> 
                </div>
                <div className="grid gap-8 min-w-0 items-stretch w-full
                  grid-cols-[repeat(auto-fit,minmax(500px,1fr))]">
                 <div className="min-w-0 h-full">
                    <UpdatePassword user={user} />
                  </div>
                </div>
  
                
  
              </div>
            </div>
 


</>
)
}
