import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  ChevronLeft,
} from "lucide-react";
import { getStoredUser } from "@/shared/lib/auth";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { label: "Бош саҳифа", to: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Буюртмалар", to: "/admin/orders", icon: <ClipboardList className="h-5 w-5" /> },
];

const doctorNav: NavItem[] = [
  { label: "Бош саҳифа", to: "/doctor", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Буюртмалар", to: "/doctor/orders", icon: <ClipboardList className="h-5 w-5" /> },
];

const patientNav: NavItem[] = [
  { label: "Бош саҳифа", to: "/patient", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Буюртмалар", to: "/patient/orders", icon: <ClipboardList className="h-5 w-5" /> },
];

// Page title mapping
const pageTitles: Record<string, string> = {
  "/admin": "Бош саҳифа",
  "/admin/orders": "Буюртмалар",
  "/admin/orders/new": "Янги буюртма",
  "/admin/services": "Хизматлар",
  "/admin/services/new": "Янги хизмат",
  "/admin/doctors": "Шифокорлар",
  "/admin/doctors/new": "Янги шифокор",
  "/admin/profile": "Профил",
  "/doctor": "Бош саҳифа",
  "/doctor/orders": "Буюртмалар",
  "/doctor/orders/": "Буюртмалар",
  "/doctor/profile": "Профил",
  "/patient": "Бош саҳифа",
  "/patient/orders": "Буюртмалар",
  "/patient/profile": "Профил",
};

function getInitial(name: string) {
  return (name[0] ?? "").toUpperCase();
}

export function MobileHeader() {
  const { location } = useRouterState();
  const router = useRouter();

  // Determine if we're on a sub-page (needs back button)
  const pathParts = location.pathname.split("/").filter(Boolean);
  const isSubPage = pathParts.length > 2; // e.g. /admin/doctors/123

  // Get title
  const title = pageTitles[location.pathname] ?? getSubPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="relative flex h-11 items-center justify-center px-4">
        {/* Left: back button */}
        {isSubPage && (
          <button
            onClick={() => router.history.back()}
            className="absolute left-2 flex items-center text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Орқага</span>
          </button>
        )}

        {/* Center: title */}
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
    </header>
  );
}

function getSubPageTitle(pathname: string): string {
  if (pathname.includes("/doctors/")) return "Шифокор";
  if (pathname.match(/\/orders\/[^/]+$/)) return "Буюртма";
  if (pathname.includes("/services/")) return "Хизмат";
  return "";
}

export function BottomNav() {
  const user = getStoredUser();
  const { location } = useRouterState();

  const baseNav =
    user?.role === "admin"
      ? adminNav
      : user?.role === "doctor"
        ? doctorNav
        : patientNav;

  const profileTo = `/${user?.role}/profile`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {baseNav.map((item) => {
          const isActive =
            item.to === location.pathname ||
            (item.to !== `/${user?.role}` &&
              location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Profile tab */}
        <Link
          to={profileTo}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
            location.pathname === profileTo
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          <Avatar className="h-5 w-5 text-[8px]">
            <AvatarFallback className="text-[8px]">
              {getInitial(user?.full_name ?? "")}
            </AvatarFallback>
          </Avatar>
          <span>Профил</span>
        </Link>
      </div>
    </nav>
  );
}
