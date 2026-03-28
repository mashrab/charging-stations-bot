import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredUser, getRoleDashboardPath } from "@/shared/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const user = getStoredUser();
    if (user) {
      throw redirect({ to: getRoleDashboardPath(user.role) });
    }
    throw redirect({ to: "/login" });
  },
});
