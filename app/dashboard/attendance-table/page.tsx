import { createClient } from "@/lib/supabase/client"


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
                        {attendance?.map((log) => (
                            <tr key={log.id}>
                            <td>{log.profiles?.first_name} {log.profiles?.last_name}</td>
                            <td>{log.clock_in ? new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>
                            <td>{log.break ? new Date(log.break).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>
                            <td>{log.end_break ? new Date(log.end_break).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>
                            <td>{log.clock_out ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>
                            <td>{log.created_at ? new Date(log.created_at).toLocaleDateString() : '-'}</td>
                            </tr>
                        ))}
                        </tbody>

                </table>
        </div>
        </>
        
    )
}

