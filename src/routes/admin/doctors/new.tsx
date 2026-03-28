import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { PhoneInput, stripPhone } from "@/shared/ui/phone-input";
import { FormField } from "@/shared/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/doctors/new")({
  component: NewDoctorPage,
});

function NewDoctorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: {
      full_name: string;
      phone: string;
      password: string;
      specialty: string;
    }) => api("/doctors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("Шифокор қўшилди");
      navigate({ to: "/admin/doctors" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      full_name: fullName,
      phone: stripPhone(phone),
      password,
      specialty,
    });
  }

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
                autoComplete="off"
                required
              />
            </FormField>

            <FormField label="Телефон рақам" htmlFor="phone">
              <PhoneInput id="phone" value={phone} onChange={setPhone} required />
            </FormField>

            <FormField
              label="Парол"
              htmlFor="password"
              description="Шифокор тизимга кириш учун ишлатади"
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
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
                placeholder="Тиш шифокори"
                required
              />
            </FormField>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          Қўшиш
        </Button>
      </form>
    </div>
  );
}
