"use client"

import ClockCard from "@/components/ClockCard"
import WorkedHoursCard from "@/components/ui/WorkedHoursCard";
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client";

const supabase = createClient()

async function getUserFirstName() {
  const { data: { user } } = await supabase.auth.getUser();
  return (user?.user_metadata?.first_name as string | undefined) ?? "";
}

export default function DashboardPage(){

  const [name, setName] = useState<string>("");


    useEffect(() => {
    getUserFirstName().then(setName);
  }, []);


  return(
    <>
    <div className="m-10">
        <h2 className="text-3xl">Welcome back, {name}!</h2>
    </div>
    
    <div className="m-5 flex w-full">

      <div className="w-150">
        <ClockCard />
      </div>
      

      <div className="w-full">
        <WorkedHoursCard />
      </div>

    </div>

    <div className="m-5">
     <WorkedHoursCard />
    </div>
    
    
    </>
  )
}