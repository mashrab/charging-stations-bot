import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/fetch";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/shared/ui/table";
import { formatMoney } from "@/shared/lib/format";

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: AdminOrderDetail,
});

interface OrderDetail {
  id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string | null;
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

function AdminOrderDetail() {
  const { orderId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<{ order: OrderDetail }>(`/orders/${orderId}`),
  });

  if (isLoading) return <p>Юкланмоқда...</p>;
  const order = data?.order;
  if (!order) return <p>Буюртма топилмади</p>;

  const total = order.items.reduce(
    (sum, i) => sum + (i.actual_price ?? i.official_price) * i.quantity,
    0,
  );

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
            {order.doctor_name && (
              <TableRow>
                <TableCell className="text-muted-foreground">Шифокор</TableCell>
                <TableCell className="text-right">{order.doctor_name}</TableCell>
              </TableRow>
            )}
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
                {item.actual_price != null && item.actual_price !== item.official_price ? (
                  <TableCell className="text-right text-muted-foreground line-through">
                    {formatMoney(item.official_price)} сўм
                  </TableCell>
                ) : (
                  <TableCell className="text-right">
                    {formatMoney(item.official_price)} сўм
                  </TableCell>
                )}
              </TableRow>
            ))}
            {order.items.some((i) => i.actual_price != null && i.actual_price !== i.official_price) && (
              <TableRow>
                <TableCell className="text-muted-foreground">Чегирма билан</TableCell>
                <TableCell className="text-right ">
                  {formatMoney(total)} сўм
                </TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell className="text-muted-foreground">Жами</TableCell>
              <TableCell className="text-right ">
                {formatMoney(total)} сўм
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  );
}
