
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";





export default function WorkedHoursCard() {

    return(

        <Card className="w-40 max-w-sm rounded-2xl border-black/10 shadow-sm h-40">
            <CardHeader className="space-y-1">
                <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-black text-center">
                    Total Hours:
                </CardTitle>
            </CardHeader>

            <CardContent>

            </CardContent>
        </Card>
    )
}