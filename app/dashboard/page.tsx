"use client"


import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react";

const supabase = createClient();

 const getUser = async () =>{
    const { 
        data: { user },
     } = await supabase.auth.getUser();
    const metadata = user?.user_metadata;
    const userFirstName = metadata?.first_name;
    return userFirstName;
 }

export default function DashboardPage() {
    const [name, setName] = useState<string | null>(" ");

useEffect(() => {
    getUser().then(setName)
}, []);



    return(
        <div>
            <h1 className="text-black">Welcome to your Dashboard, {name}</h1>

        </div>
    )
}