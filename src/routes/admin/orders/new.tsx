import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { PhoneInput, stripPhone } from "@/shared/ui/phone-input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { FormField } from "@/shared/ui/form-field";
import { Card, CardContent } from "@/shared/ui/card";
import { toast } from "sonner";
import { formatMoney } from "@/shared/lib/format";

export const Route = createFileRoute("/admin/orders/new")({
  component: NewOrderPage,
});

interface Service {
  id: string;
  name: string;
  official_price: number;
}

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
}

function NewOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => api<{ services: Service[] }>("/services"),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api<{ doctors: Doctor[] }>("/doctors"),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      patient_phone: string;
      patient_name: string;
      patient_password: string;
      doctor_id?: string;
      notes?: string;
      items: Array<{ service_id: string; quantity: number }>;
    }) => api("/orders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Буюртма яратилди");
      navigate({ to: "/admin/orders" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService) {
      toast.error("Хизмат танланг");
      return;
    }
    createMutation.mutate({
      patient_phone: stripPhone(patientPhone),
      patient_name: patientName,
      patient_password: "12345678",
      doctor_id: selectedDoctor || undefined,
      notes: notes || undefined,
      order_date: orderDate,
      items: [{ service_id: selectedService, quantity: 1 }],
    });
  }

  const services = servicesData?.services ?? [];
  const doctors = doctorsData?.doctors ?? [];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <Card>
          <CardContent className="space-y-4">
            <FormField label="Бемор исми" htmlFor="patient-name">
              <Input
                id="patient-name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                autoComplete="off"
                required
              />
            </FormField>

            <FormField label="Бемор телефон рақами" htmlFor="patient-phone">
              <PhoneInput
                id="patient-phone"
                value={patientPhone}
                onChange={setPatientPhone}
                required
              />
            </FormField>

            <FormField label="Шифокор" htmlFor="doctor">
              <NativeSelect
                id="doctor"
                className="w-full"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
              >
                <NativeSelectOption value="">Танланг</NativeSelectOption>
                {doctors.map((d) => (
                  <NativeSelectOption key={d.id} value={d.id}>
                    {d.full_name} — {d.specialty}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>

            <FormField label="Хизмат" htmlFor="service">
              <NativeSelect
                id="service"
                className="w-full"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                required
              >
                <NativeSelectOption value="">Танланг</NativeSelectOption>
                {services.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.name} — {formatMoney(s.official_price)} сўм
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>

            <FormField label="Буюртма санаси" htmlFor="order-date">
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </FormField>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          Яратиш
        </Button>
      </form>
    </div>
  );
}
