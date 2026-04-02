🕒 TimeWise – Multi-Tenant Attendance Tracking SaaS

TimeWise is a modern, web-based attendance tracking system designed for teams and organizations. It enables real-time time tracking, leave management, and workforce visibility through a clean, enterprise-grade dashboard.

⚡ This project was originally built using the MERN stack and later rebuilt using Next.js, Supabase, and shadcn/ui to improve scalability, development speed, and system architecture.

![timewise-rebuilt1](https://github.com/user-attachments/assets/69315100-c7d9-4716-ad22-6d5800058ebb)

![timewise-rebuilt2](https://github.com/user-attachments/assets/6549b773-78dd-4a4b-b560-c2a817d9071d)


🚀 Live Evolution
🧱 Previous Version (MERN)

The initial version of TimeWise was built using:

MongoDB
Express.js
React
Node.js
JWT Authentication


⚡ Current Version (Rebuilt)

The system has been fully re-architected using modern tools:

Framework: Next.js (App Router)
Backend-as-a-Service: Supabase (PostgreSQL, Auth, Realtime)
UI System: shadcn/ui + Tailwind CSS
Database: PostgreSQL with Row-Level Security (RLS)
Architecture: Multi-tenant SaaS
🎯 Why the Rebuild?

The original MERN version worked, but had limitations:

Required manual backend/API management
Slower iteration when adding features
No built-in real-time capabilities
Harder to scale for multi-tenant use cases
✅ Improvements with Next.js + Supabase
🔄 Faster Development
Eliminated custom backend boilerplate
Leveraged Supabase for auth, database, and realtime
🏢 Multi-Tenant Architecture
Implemented using PostgreSQL + RLS policies
Each company securely accesses its own data
⚡ Real-Time Capabilities
Instant updates for attendance tracking
🎨 Modern UI System
Built with shadcn/ui
Clean, consistent, enterprise SaaS design
🧠 Simplified Infrastructure
Reduced complexity compared to MERN setup
Focused more on product features instead of backend plumbing
✨ Features
🔐 Authentication (Supabase Auth)
Secure login and session handling with built-in auth system
🕓 Clock In / Clock Out
Track employee time entries with accurate timestamps
☕ Break Tracking
Record and manage breaks within work sessions
📊 Attendance Dashboard
View logs, summaries, and team activity
🏢 Multi-Tenant Support
Each organization has isolated data using RLS
📩 Invite-Based Onboarding
Admins can invite users to join their company workspace
🧾 Leave Requests
Employees can submit and track leave applications
🎛️ Admin Controls
Manage users, roles, and attendance visibility
🧱 Tech Stack
🆕 Current Stack
Next.js (App Router)
Supabase
PostgreSQL
Authentication
Row-Level Security (RLS)
Realtime subscriptions
shadcn/ui
Tailwind CSS
🧪 Previous Stack (MERN)
MongoDB
Express.js
React
Node.js
JWT Authentication
⚙️ Setup (Current Version)
1. Clone the repository
git clone https://github.com/yourusername/timewise.git
cd timewise
2. Install dependencies
npm install
3. Setup environment variables

Create a .env.local file:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
4. Run the development server
npm run dev
🔐 Multi-Tenant Architecture (Simplified)
Each user belongs to a company/workspace
Data is scoped using company_id
Supabase Row-Level Security (RLS) ensures:
Users can only access their own company’s data
Secure isolation between tenants
🎨 UI System

The UI is built using:

shadcn/ui components
Tailwind CSS
Clean enterprise SaaS design principles:
consistent spacing
accessible contrast
reusable components
responsive layouts
🧠 Key Learnings
Choosing the right stack can significantly improve development speed
Supabase simplifies backend complexity for SaaS products
RLS is powerful for multi-tenant systems when implemented correctly
UI consistency matters as much as functionality in real-world apps
AI-assisted development can accelerate shipping, but still requires manual validation and testing
🧪 Future Improvements
Advanced analytics & reporting
Role-based permissions (fine-grained)
Notifications & alerts
Mobile optimization
Payroll integration
Audit logs
👨‍💻 Author

Gian (Gipps)
Full-Stack Developer
Building practical, scalable SaaS applications with modern tools
