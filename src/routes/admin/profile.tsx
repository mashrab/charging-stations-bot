import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getStoredUser, clearAuth } from "@/shared/lib/auth";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Card, CardContent } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/shared/ui/table";
import { LogOut, ChevronRight } from "lucide-react";
import { formatPhone } from "@/shared/lib/format";

export const Route = createFileRoute("/admin/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const user = getStoredUser();
  const navigate = useNavigate();

  const initial = (user?.full_name?.[0] ?? "").toUpperCase();

  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAuth();
    navigate({ to: "/login" });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 pt-4">
        <Avatar className="h-20 w-20 text-2xl">
          <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="text-lg font-semibold">{user?.full_name}</p>
          <p className="text-sm text-muted-foreground">Администратор</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">Телефон</TableCell>
                <TableCell className="text-right">{formatPhone(user?.phone ?? "")}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow className="cursor-pointer" onClick={() => navigate({ to: "/admin/services" })}>
                <TableCell>Хизматлар</TableCell>
                <TableCell className="text-right">
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
              <TableRow className="cursor-pointer" onClick={() => navigate({ to: "/admin/doctors" })}>
                <TableCell>Шифокорлар</TableCell>
                <TableCell className="text-right">
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Тизимдан чиқиш
      </Button>
    </div>
  );
}
