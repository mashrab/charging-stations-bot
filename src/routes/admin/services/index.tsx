import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { Plus } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";

export const Route = createFileRoute("/admin/services/")({
  component: AdminServices,
});

interface Service {
  id: string;
  name: string;
  description: string | null;
  official_price: number;
  is_active: number;
}

const columns: ColumnDef<Service>[] = [
  {
    accessorKey: "name",
    header: "Номи",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "official_price",
    header: () => <div className="text-right">Нарх</div>,
    cell: ({ row }) => (
      <div className="text-right whitespace-nowrap">
        {formatMoney(row.getValue("official_price"))} сўм
      </div>
    ),
  },
];

function AdminServices() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => api<{ services: Service[] }>("/services"),
  });

  const services = data?.services ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Хизматлар</h1>
        <Link to="/admin/services/new">
          <Button>
            <Plus className="h-4 w-4" />
            Қўшиш
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p>Юкланмоқда...</p>
      ) : (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={services}
              onRowClick={(s) =>
                navigate({
                  to: "/admin/services/$serviceId",
                  params: { serviceId: s.id },
                })
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
