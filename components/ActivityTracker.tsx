"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Attendance = {
  status: string;
  created_at: string;
};

export default function ActivityTracker() {
  const supabase = createClient();

  const [activity, setActivity] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getCurrentActivity() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        setActivity(data);
      } catch (error) {
        console.error("Error fetching activity:", error);
      } finally {
        setIsLoading(false);
      }
    }

    getCurrentActivity();
  }, []);

  function formatStatus(status: string) {
  switch (status) {
    case "clock_in":
      return "Clocked in";
    case "clock_out":
      return "Clocked out";
    case "break":
      return "Started break";
    case "end_break":
      return "Ended break";
    default:
      return "Unknown activity";
  }
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}


    

    return (
    <div className="rounded-lg border p-4 text-black">
      <h2 className="text-lg font-semibold">Activity Tracker</h2>

      {isLoading && <p>Loading current activity...</p>}

      {!isLoading && !activity && (
        <p className="text-gray-500">No activity recorded yet</p>
      )}

      {!isLoading && activity && (
        <div className="mt-2">
          <p className="font-medium">
            {formatStatus(activity.status)}
          </p>
          <p className="text-sm text-gray-500">
            {formatTime(activity.created_at)}
          </p>
        </div>
      )}
    </div>
  );
}
