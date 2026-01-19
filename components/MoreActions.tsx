"use client";


import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { CalendarPlus, Sheet, BadgeDollarSign, BanknoteArrowUp, Link } from "lucide-react";

export default function MoreActions(){

  return (
    <Card className="w-full rounded-2xl border-black/10 shadow-sm h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-black text-center">
          More Actions
        </CardTitle>
      </CardHeader>

            <CardContent>

         
        <div className="grid grid-cols-2 gap-3">

          <a href=""
           target="_blank"
           rel="noopener noreferrer">  
          <Button variant="outline" className="flex items-center gap-3 w-full">
            <CalendarPlus className="h-5 w-5" />
            Request Leave
          </Button>
          </a>


        <a href=""
           target="_blank"
           rel="noopener noreferrer">
          <Button variant="outline" className="flex items-center gap-3 w-full">
            <Sheet className="h-5 w-5" />
            Items Masterlist
          </Button>
          </a>


       <a href=" "
            target="_blank"
            rel="noopener noreferrer">
            <Button variant="outline" className="flex items-center gap-3 w-full">
              <BadgeDollarSign className="h-5 w-5" />
              Sales Sheet
            </Button>
          </a>


        <a href="" 
           target="_blank"
          rel="noopener noreferrer">
          <Button variant="outline" className="flex items-center gap-3 w-full">
            <BanknoteArrowUp className="h-5 w-5" />
            Capital & Pricelist
          </Button>

          </a>
        </div>
      </CardContent>

    </Card>
  );
}
