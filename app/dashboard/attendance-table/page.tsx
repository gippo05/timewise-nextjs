import { createClient } from "@/lib/supabase/client"


export default async function AttendanceTablePage() {

// Create supabase
const supabase = createClient();

// Fetch all attendance record (Login, Break, End Break, Logout)
const {data: attendance, error} = await supabase
.from('attendance')
.select('*')
.order('created_at', {ascending: false})

// Display all attendance records via mapping them one by one into the table
    return(
        <>
        <div>                     
                <table className="text-black border">
                    <thead>
                        <tr className="border">
                            <th>Name</th>
                            <th>Login</th>
                            <th>Break</th>
                            <th>End Break</th>
                            <th>Logout</th>
                            <th>Date</th>
                        </tr>
                    </thead>

                    <tbody>
                       {attendance?.map((log) =>
                    (
                        <tr key={log.id}>
                            <td>Placeholder</td>
                            <td>{log.clock_in}</td>
                            <td>{log.break}</td>
                            <td>{log.end_break}</td>
                            <td>{log.clock_out}</td>
                            <td></td>
                        </tr>
                    ))} 
                        
                    </tbody>
                </table>
        </div>
        </>
        
    )
}

