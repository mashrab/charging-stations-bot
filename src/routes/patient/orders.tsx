import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/fetch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Eye, ClipboardList } from "lucide-react";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatMoney } from "@/shared/lib/format";

export const Route = createFileRoute("/patient/orders")({
  component: PatientOrders,
});

const statusLabels: Record<string, string> = {
  pending: "Кутилмоқда",
  in_progress: "Жараёнда",
  completed: "Якунланган",
  cancelled: "Бекор қилинган",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "warning",
  in_progress: "default",
  completed: "success",
  cancelled: "destructive",
};

function PatientOrders() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () =>
      api<{
        orders: Array<{
          id: string;
          doctor_name: string | null;
          status: string;
          notes: string | null;
          created_at: number;
        }>;
      }>("/orders"),
  });

  const { data: orderDetailData } = useQuery({
    queryKey: ["order", selectedOrderId],
    queryFn: () =>
      api<{
        order: {
          id: string;
          doctor_name: string | null;
          status: string;
          notes: string | null;
          items: Array<{
            id: string;
            service_name: string;
            official_price: number;
            actual_price: number | null;
            quantity: number;
          }>;
        };
      }>(`/orders/${selectedOrderId}`),
    enabled: !!selectedOrderId,
  });

  const orders = ordersData?.orders ?? [];
  const orderDetail = orderDetailData?.order;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Буюртмаларим</h1>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Буюртма тафсилотлари</DialogTitle>
          </DialogHeader>
          {orderDetail && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Шифокор</span>
                  <span>{orderDetail.doctor_name ?? "Тайинланмаган"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ҳолат</span>
                  <Badge variant={statusVariant[orderDetail.status]}>
                    {statusLabels[orderDetail.status]}
                  </Badge>
                </div>
              </div>
              {orderDetail.notes && (
                <p className="text-sm text-muted-foreground">{orderDetail.notes}</p>
              )}
              <div className="space-y-2">
                {orderDetail.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <p className="font-medium">{item.service_name}</p>
                      <p className="text-xs text-muted-foreground">Сони: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      {formatMoney(item.actual_price ?? item.official_price)} сўм
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p>Юкланмоқда...</p>
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Буюртмалар йўқ" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardHeader>
                <CardTitle>{o.doctor_name ?? "Тайинланмаган"}</CardTitle>
                <CardDescription>
                  {new Date(o.created_at * 1000).toLocaleDateString("uz-UZ")}
                </CardDescription>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedOrderId(o.id);
                      setDetailOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardFooter>
                <Badge variant={statusVariant[o.status]}>
                  {statusLabels[o.status]}
                </Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
