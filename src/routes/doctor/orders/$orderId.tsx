import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/shared/ui/table";
import { PriceInput, stripPrice } from "@/shared/ui/price-input";
import { FormField } from "@/shared/ui/form-field";
import { formatMoney } from "@/shared/lib/format";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/orders/$orderId")({
  component: DoctorOrderDetail,
});

interface OrderDetail {
  id: string;
  patient_name: string;
  patient_phone: string;
  status: string;
  order_date: string | null;
  items: Array<{
    id: string;
    service_name: string;
    official_price: number;
    actual_price: number | null;
    quantity: number;
  }>;
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

function DoctorOrderDetail() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<{ order: OrderDetail }>(`/orders/${orderId}`),
  });

  const completeMutation = useMutation({
    mutationFn: (items: Array<{ id: string; actual_price: number }>) =>
      api(`/orders/${orderId}/complete`, {
        method: "PUT",
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast.success("Буюртма якунланди");
      navigate({ to: "/doctor" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleComplete() {
    if (!data?.order) return;
    const items = data.order.items.map((item) => ({
      id: item.id,
      actual_price: itemPrices[item.id]
        ? stripPrice(itemPrices[item.id])
        : item.official_price,
    }));
    completeMutation.mutate(items);
  }

  if (isLoading) return <p>Юкланмоқда...</p>;
  const order = data?.order;
  if (!order) return <p>Буюртма топилмади</p>;

  const canComplete = order.status === "pending" || order.status === "in_progress";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground">Бемор</TableCell>
              <TableCell className="text-right">{order.patient_name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Телефон</TableCell>
              <TableCell className="text-right">{order.patient_phone}</TableCell>
            </TableRow>
            {order.order_date && (
              <TableRow>
                <TableCell className="text-muted-foreground">Сана</TableCell>
                <TableCell className="text-right">{order.order_date}</TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell className="text-muted-foreground">Ҳолат</TableCell>
              <TableCell className="text-right">
                <Badge variant={statusVariant[order.status]}>
                  {statusLabels[order.status]}
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">
                    {item.service_name} x{item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.official_price)} сўм
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canComplete && order.items.map((item) => (
        <Card key={item.id}>
          <CardContent>
            <FormField label={`${item.service_name} — ҳақиқий нарх`}>
              <PriceInput
                value={itemPrices[item.id] ?? formatMoney(item.official_price)}
                onChange={(v) =>
                  setItemPrices({ ...itemPrices, [item.id]: v })
                }
              />
            </FormField>
          </CardContent>
        </Card>
      ))}

      {!canComplete && order.items.some((i) => i.actual_price != null) && (
        <Card>
          <CardContent>
            <Table>
              <TableBody>
                {order.items.map((item) =>
                  item.actual_price != null ? (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">
                        {item.service_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.actual_price)} сўм
                      </TableCell>
                    </TableRow>
                  ) : null,
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {canComplete && (
        <Button
          onClick={handleComplete}
          className="w-full"
          disabled={completeMutation.isPending}
        >
          <CheckCircle className="h-4 w-4" />
          Якунлаш
        </Button>
      )}
    </div>
  );
}
