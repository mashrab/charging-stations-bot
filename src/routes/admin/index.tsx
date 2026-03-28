import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/fetch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/ui/empty-state";
import { ClipboardList } from "lucide-react";
import { Plus } from "lucide-react";
import { formatMoney, formatDateUz } from "@/shared/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface Order {
  id: string;
  patient_name: string;
  status: string;
  order_date: string | null;
  service_names: string | null;
  total_price: number;
  created_at: number;
}

const statusLabels: Record<string, string> = {
  pending: "Кутилмоқда",
  in_progress: "Жараёнда",
  completed: "Якунланган",
  cancelled: "Бекор қилинган",
};

const statusVariant: Record<
  string,
  "warning" | "default" | "success" | "destructive"
> = {
  pending: "warning",
  in_progress: "default",
  completed: "success",
  cancelled: "destructive",
};

function formatDate(order: Order): string {
  if (order.order_date) return order.order_date;
  return new Date(order.created_at * 1000).toISOString().split("T")[0];
}

function AdminDashboard() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      api<{
        stats: {
          total_orders: number;
          official_revenue: number;
          actual_revenue: number;
          total_patients: number;
          active_orders: number;
        };
      }>("/dashboard/stats"),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<{ orders: Order[] }>("/orders"),
  });

  const stats = statsData?.stats;
  const orders = ordersData?.orders ?? [];

  // Group by date
  const grouped = new Map<string, Order[]>();
  for (const order of orders) {
    const date = formatDate(order);
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(order);
  }
  const sortedDates = Array.from(grouped.keys()).sort();

  return (
    <div className="space-y-4">
      <Link to="/admin/orders/new" className="block">
        <Button className="w-full">
          <Plus className="h-4 w-4" />
          Янги буюртма
        </Button>
      </Link>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-2">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Жами буюртмалар
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats?.total_orders ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Фаол буюртмалар
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats?.active_orders ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Расмий даромад
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatMoney(stats?.official_revenue ?? 0)} сўм
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ҳақиқий даромад
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatMoney(stats?.actual_revenue ?? 0)} сўм
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Буюртмалар йўқ" description="Янги буюртма яратинг" />
      ) : (
        sortedDates.map((date) => (
          <div key={date} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {formatDateUz(date)}
            </h2>
            {grouped.get(date)!.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders/$orderId"
                params={{ orderId: o.id }}
                className="block"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{o.patient_name}</CardTitle>
                    {o.service_names && (
                      <CardDescription>
                        {o.service_names} · {formatMoney(o.total_price)} сўм
                      </CardDescription>
                    )}
                    <CardAction>
                      <Badge variant={statusVariant[o.status]}>
                        {statusLabels[o.status]}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
