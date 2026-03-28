import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { PhoneInput, stripPhone } from "@/shared/ui/phone-input";
import { FormField } from "@/shared/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/doctors/$doctorId")({
  component: DoctorEditPage,
});

interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  specialty: string;
  is_active: number;
}

function phoneToLocal(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  if (local.length <= 2) return local;
  return local.slice(0, 2) + " " + local.slice(2);
}

function DoctorEditPage() {
  const { doctorId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => api<{ doctor: Doctor }>(`/doctors/${doctorId}`),
  });

  useEffect(() => {
    if (data?.doctor) {
      setFullName(data.doctor.full_name);
      setPhone(phoneToLocal(data.doctor.phone));
      setSpecialty(data.doctor.specialty);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (body: { full_name?: string; phone?: string; specialty?: string }) =>
      api(`/doctors/${doctorId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["doctor", doctorId] });
      toast.success("Шифокор янгиланди");
      navigate({ to: "/admin/doctors" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      full_name: fullName,
      phone: stripPhone(phone),
      specialty,
    });
  }

  if (isLoading) return <p>Юкланмоқда...</p>;

  const doctor = data?.doctor;
  if (!doctor) return <p>Шифокор топилмади</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Шахсий маълумотлар</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Тўлиқ исм" htmlFor="full-name">
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Телефон рақам" htmlFor="phone">
              <PhoneInput id="phone" value={phone} onChange={setPhone} required />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Касбий маълумотлар</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Мутахассислик" htmlFor="specialty">
              <Input
                id="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                required
              />
            </FormField>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
          Сақлаш
        </Button>
      </form>
    </div>
  );
}
