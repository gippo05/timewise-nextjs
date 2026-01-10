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
  const [name, setName] = useState<string | null>("");
  const [temporaryStatus, setTemporaryStatus] = useState<string>("");

  useEffect(() => {
    getUser().then(setName)
  }, []);

  const date = new Date();

  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];
  const months = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"
  ];

  const today = `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const timestamp = new Date().toISOString();    
      let attendanceId: string | undefined;

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        console.error("No logged-in user");
        return;
      }

      if (temporaryStatus === 'Clocked-in') {
        const { data, error } = await supabase
          .from('attendance')
          .insert([{ clock_in: timestamp, user_id: userId }]);

        if (error) {
          console.error("Insert error: ", error);
          return;
        }

        if (!data) {
          console.error("No attendance returned");
          return;
        }

        attendanceId = data[0].id;
        console.log("Inserted attendance with ID:", attendanceId);

      } else {
        // For other statuses, update only the mapped column
        const statusToColumnMap: Record<string, string> = {
          "Break": "break",
          "End-Break": "end_break",
          "Clocked-out": "clock_out",
        };

        const columnToUpdate = statusToColumnMap[temporaryStatus];

        if (!columnToUpdate) {
          console.error("Invalid status selected for update:", temporaryStatus);
          return;
        }

        // Find the active attendance row (clock_out IS NULL)
        const { data, error } = await supabase
          .from('attendance')
          .select('id')
          .eq('user_id', userId)
          .is('clock_out', null)
          .limit(1)
          .single();

        if (error || !data) {
          console.error('Failed to find active attendance:', error);
          return;
        }

        attendanceId = data.id;
        console.log("Updating attendance ID:", attendanceId, "column:", columnToUpdate);

        const { error: updateError } = await supabase
          .from('attendance')
          .update({ [columnToUpdate]: timestamp })
          .eq('id', attendanceId);

        if (updateError) {
          console.error("Update error:", updateError);
          return;
        }
      }

      // Optionally, reset the select after successful submission
      setTemporaryStatus("");

    } catch (error) {
      console.error("Error", error);
    }
  }

  return (
    <>
      <div>
        <div className="w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mt-5">
          {/* Greeting */}
          <div className="w-full md:w-auto text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">👋 Welcome back, {name}!</h2>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">{today}</p>
          </div>

          {/* Form Controls */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row w-full md:w-auto gap-4 sm:gap-6"
          >
            {/* Status */}
            <div className="flex flex-col w-full sm:w-56">
              <label
                htmlFor="status"
                className="mb-2 text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={temporaryStatus}
                onChange={(e) => setTemporaryStatus(e.target.value)}
                required
                className="px-3 py-2 text-base sm:text-lg rounded-xl border border-gray-300
                           focus:ring-2 focus:ring-blue-400 focus:outline-none
                           transition-colors duration-200 cursor-pointer text-black"
              >
                <option value="">Please select</option>
                <option value="Clocked-in">Clocked-in</option>
                <option value="Break">Break</option>
                <option value="End-Break">End Break</option>
                <option value="Clocked-out">Clocked-out</option>
              </select>
            </div>

            {/* Button */}
            <div className="flex items-end justify-center sm:justify-start">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 sm:px-6 py-2 text-base sm:text-lg font-semibold text-white bg-blue-500
                           rounded-xl shadow-md hover:bg-blue-600 active:bg-blue-700
                           transition-all duration-200 cursor-pointer"
              >
                Change Status
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
