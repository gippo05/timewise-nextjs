"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase = createClient();



export default function ClockCard() {
  const [temporaryStatus, setTemporaryStatus] = useState<string>("");



  const today = useMemo(() => {
    const d = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }, []);

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

      // 1) Create an attendance row when Clocked-in
      if (temporaryStatus === "Clocked-in") {
        const { data, error } = await supabase
          .from("attendance")
          .insert([{ clock_in: timestamp, user_id: userId }])
          .select("id")
          .single();

        if (error) {
          console.error("Insert error:", error);
          return;
        }

        if (!data) {
          console.error("No attendance returned");
          return;
        }

        attendanceId = data.id;
      } else {
        // 2) Otherwise, update the active attendance row
        const { data, error } = await supabase
          .from("attendance")
          .select("id")
          .eq("user_id", userId)
          .is("clock_out", null)
          .limit(1)
          .single();

        if (error || !data) {
          console.error("Failed to find active attendance:", error, "Data:", data);
          return;
        }

        attendanceId = data.id;
      }

      const statusToColumnMap: Record<string, string> = {
        Break: "break",
        "End-Break": "end_break",
        "Clocked-out": "clock_out",
      };

      const columnToUpdate = statusToColumnMap[temporaryStatus];

      if (columnToUpdate) {
        const { error } = await supabase
          .from("attendance")
          .update({ [columnToUpdate]: timestamp })
          .eq("id", attendanceId);

        if (error) {
          console.error("Update error:", error);
          return;
        }
      }

      setTemporaryStatus("");
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <Card className="w-full max-w-sm rounded-2xl border-black/10 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-black">
          Clock status
        </CardTitle>
        <p className="text-xs text-black/60">
          {today}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label className="text-black/80">Select action</Label>

            <Select value={temporaryStatus} onValueChange={setTemporaryStatus}>
              <SelectTrigger className="h-11 rounded-xl border-black/15 focus-visible:ring-black/20">
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Clocked-in">Clock in</SelectItem>
                <SelectItem value="Break">Start break</SelectItem>
                <SelectItem value="End-Break">End break</SelectItem>
                <SelectItem value="Clocked-out">Clock out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={!temporaryStatus}
            className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-50 cursor-pointer"
          >
            Change Status
          </Button>

          <p className="text-[11px] text-black/40 leading-relaxed">
            Tip: Keep this card small. The table and summaries should do the heavy lifting.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
