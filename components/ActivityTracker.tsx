"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function ActivityTracker() {
  return (
    <Card className="h-full w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-base font-semibold tracking-tight sm:text-lg">
          Activity Tracker
        </CardTitle>
      </CardHeader>

      <CardContent />
    </Card>
  );
}
