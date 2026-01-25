import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: "TimeWise Attendance Tracker"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
        <Toaster theme="light" position="top-right" />
      </body>
    </html>
  );
}
