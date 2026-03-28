import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/fetch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { ClipboardList } from "lucide-react";
import { formatMoney, formatDateUz } from "@/shared/lib/format";

export const Route = createFileRoute("/doctor/orders/")({
  component: DoctorOrders,
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

const statusVariant: Record<string, "warning" | "default" | "success" | "destructive"> = {
  pending: "warning",
  in_progress: "default",
  completed: "success",
  cancelled: "destructive",
};

function formatDate(order: Order): string {
  if (order.order_date) return order.order_date;
  return new Date(order.created_at * 1000).toISOString().split("T")[0];
}


function DoctorOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<{ orders: Order[] }>("/orders"),
  });

  const orders = data?.orders ?? [];

  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === "pending" || o.status === "in_progress").length;
  const officialSum = orders.reduce((s, o) => s + (o.total_price ?? 0), 0);
  const completedOrders = orders.filter((o) => o.status === "completed");
  const actualSum = completedOrders.reduce((s, o) => s + (o.total_price ?? 0), 0);

  // Group by date
  const grouped = new Map<string, Order[]>();
  for (const order of orders) {
    const date = formatDate(order);
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(order);
  }

  const sortedDates = Array.from(grouped.keys()).sort();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Жами буюртмалар
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Фаол
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Расмий даромад
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(officialSum)} сўм</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ҳақиқий даромад
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(actualSum)} сўм</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p>Юкланмоқда...</p>
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Буюртмалар йўқ" />
      ) : (
        sortedDates.map((date) => (
          <div key={date} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {formatDateUz(date)}
            </h2>
            {grouped.get(date)!.map((o) => (
              <Link key={o.id} to="/doctor/orders/$orderId" params={{ orderId: o.id }} className="block">
                <Card>
                  <CardHeader>
                    <CardTitle>{o.patient_name}</CardTitle>
                    {o.service_names && (
                      <CardDescription>{o.service_names} · {formatMoney(o.total_price)} сўм</CardDescription>
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
