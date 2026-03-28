import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/shared/ui/card";
import { Plus, Pencil, Stethoscope } from "lucide-react";
import { EmptyState } from "@/shared/ui/empty-state";

export const Route = createFileRoute("/admin/doctors/")({
  component: AdminDoctors,
});

interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  specialty: string;
  is_active: number;
}

function AdminDoctors() {
  const { data, isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api<{ doctors: Doctor[] }>("/doctors"),
  });

  const doctors = data?.doctors ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Шифокорлар</h1>
        <Link to="/admin/doctors/new">
          <Button>
            <Plus className="h-4 w-4" />
            Қўшиш
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p>Юкланмоқда...</p>
      ) : doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title="Шифокорлар йўқ" description="Янги шифокор қўшинг" />
      ) : (
        <div className="space-y-3">
          {doctors.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle>{d.full_name}</CardTitle>
                <CardDescription>{d.phone} · {d.specialty}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Link to="/admin/doctors/$doctorId" params={{ doctorId: d.id }}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4" />
                    Таҳрирлаш
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
