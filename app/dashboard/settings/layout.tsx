import { Toaster } from "sonner";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-neutral-50">
      {/* remove mx-auto so it doesn't center */}
      <div className="w-full px-6 py-10">
        {/* optional: give it a readable width but keep it left-aligned */}
        <div className="max-w-3xl">
          {children}
        </div>
      </div>

      <Toaster theme="light" position="top-right" />
    </section>
  );
}
