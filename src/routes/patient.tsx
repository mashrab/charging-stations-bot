import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getStoredUser } from "@/shared/lib/auth";
import { MobileHeader, BottomNav } from "@/widgets/layout/ui/sidebar";

export const Route = createFileRoute("/patient")({
  beforeLoad: () => {
    const user = getStoredUser();
    if (!user) throw redirect({ to: "/login" });
    if (user.role !== "patient") throw redirect({ to: `/${user.role}` });
  },
  component: PatientLayout,
});

function PatientLayout() {
  return (
    <div className="min-h-dvh bg-gray-100">
      <MobileHeader />
      <main className="px-4 py-4 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
