import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Plus, ClipboardList } from "lucide-react";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatMoney, formatDateUz } from "@/shared/lib/format";

export const Route = createFileRoute("/admin/orders/")({
  component: AdminOrders,
});

interface Order {
  id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string | null;
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


function AdminOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<{ orders: Order[] }>("/orders"),
  });

  const orders = data?.orders ?? [];

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Буюртмалар</h1>
        <Link to="/admin/orders/new">
          <Button>
            <Plus className="h-4 w-4" />
            Янги
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p>Юкланмоқда...</p>
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Буюртмалар йўқ" description="Янги буюртма яратинг" />
      ) : (
        sortedDates.map((date) => (
          <div key={date} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {formatDateUz(date)}
            </h2>
            {grouped.get(date)!.map((o) => (
              <Link key={o.id} to="/admin/orders/$orderId" params={{ orderId: o.id }} className="block">
                <Card>
                  <CardHeader>
                    <CardTitle>{o.patient_name}</CardTitle>
                    <CardDescription>
                      {o.service_names && <>{o.service_names} · {formatMoney(o.total_price)} сўм</>}
                    </CardDescription>
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
