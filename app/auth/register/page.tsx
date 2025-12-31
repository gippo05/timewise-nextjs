"use client"

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import logo from "@/public/TimeWISE logo.png"



export default function LoginPage() {

    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const router = useRouter();

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    };

    const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFirstName(e.target.value);
    };
    const handleLastNameChange = (e:React.ChangeEvent<HTMLInputElement>) => {
        setLastName(e.target.value);
    };
    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmPassword(e.target.value);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        // Handle signup logic here

        try{
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    }
                  }
            });

            if(error) throw error;
            router.push("/auth/login");

        } catch (error: unknown){
            setError(error instanceof Error ? error.message : "An error has occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return(
     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-400 to-blue-600 px-4">
      <div className="bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Image src={logo} alt="Logo" className="mx-auto mb-4" width={150} height={50} />
          <h1 className="text-3xl font-extrabold text-blue-900 drop-shadow-sm">TimeWise</h1>
          <p className="text-sm text-blue-100 mt-2">Smart Attendance & Productivity Tracker</p>
        </div>

        <form className="space-y-6" onSubmit={handleRegister}>
          <div>
            <label className="block text-blue-900 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-blue-200
                         text-gray-900 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={handleEmailChange}
              required
            />
          </div>

          <div>
            <label className="block text-blue-900 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your desired password"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-blue-200
                         text-gray-900 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div>
            <label className="block text-blue-900 text-sm font-medium mb-2">Re-enter Password</label>
            <input
              type="password"
              placeholder="Re-enter your password"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-blue-200
                         text-gray-900 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
            />
          </div>

          {password !== confirmPassword && (
            <p className="text-red-600 mt-2">Passwords do not match.</p>
          )}

             <div>
            <label className="block text-blue-900 text-sm font-medium mb-2">First Name</label>
            <input
              type="text"
              placeholder="Enter your First Name"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-blue-200
                         text-gray-900 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={firstName}
              onChange={handleFirstNameChange}
              required
            />
          </div>

            <div>
            <label className="block text-blue-900 text-sm font-medium mb-2">Last Name</label>
            <input
              type="text"
              placeholder="Enter your Last Name"
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-blue-200
                         text-gray-900 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={lastName}
              onChange={handleLastNameChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600
                       hover:from-blue-600 hover:to-blue-700
                       text-white font-semibold transition transform hover:-translate-y-1 shadow-lg cursor-pointer
                       ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isLoading ? "Registering..." : "Register"}
          </button>

          <p className="text-center text-sm text-blue-100 mt-6">
            Already have an account?{" "}
          <a href="/auth/login" className="text-blue-200 font-medium hover:underline">
            Log In.
          </a>
          </p>


          {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
        </form>

      </div>
    </div>
    )
}