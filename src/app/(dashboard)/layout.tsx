import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50 lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
