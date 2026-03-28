import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { getStoredUser } from "@/shared/lib/auth";

export const Route = createFileRoute("/patient/")({
  component: PatientDashboard,
});

function PatientDashboard() {
  const user = getStoredUser();

  const { data } = useQuery({
    queryKey: ["orders"],
    queryFn: () =>
      api<{
        orders: Array<{ id: string; status: string }>;
      }>("/orders"),
  });

  const orders = data?.orders ?? [];
  const activeOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "in_progress",
  );
  const completedOrders = orders.filter((o) => o.status === "completed");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Хуш келибсиз, {user?.full_name}</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Жами
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Фаол
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Якунланган
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{completedOrders.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
