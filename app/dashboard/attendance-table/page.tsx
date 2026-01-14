import { createClient } from "@/lib/supabase/client"
import AttendanceTable from "../../../components/attendanceTable";



export default async function AttendanceTablePage() {

// Create supabase
const supabase = createClient();

// Fetch all attendance record (Login, Break, End Break, Logout)
const {data: attendance, error} = await supabase
.from('attendance')
.select(`*,
    profiles (
        first_name,
        last_name
    )
        `)
.order('created_at', {ascending: false})


    return(
        <AttendanceTable attendance={attendance ?? []} />
    )
}

