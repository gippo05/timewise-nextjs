"use client";


import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

export default function ActivityTracker(){

  return (
    <Card className="w-full max-w-sm rounded-2xl border-black/10 shadow-sm h-45">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-black text-center">
          Activity Tracker
        </CardTitle>
      </CardHeader>

      <CardContent>
       
    
      </CardContent>
    </Card>
  );
}
