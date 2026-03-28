import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { PriceInput, stripPrice } from "@/shared/ui/price-input";
import { FormField } from "@/shared/ui/form-field";
import { Card, CardContent } from "@/shared/ui/card";
import { formatMoney } from "@/shared/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services/$serviceId")({
  component: EditServicePage,
});

interface Service {
  id: string;
  name: string;
  description: string | null;
  official_price: number;
  is_active: number;
}

function EditServicePage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => api<{ service: Service }>(`/services/${serviceId}`),
  });

  useEffect(() => {
    if (data?.service) {
      setName(data.service.name);
      setDescription(data.service.description ?? "");
      setPrice(formatMoney(data.service.official_price));
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; description?: string; official_price?: number }) =>
      api(`/services/${serviceId}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Хизмат янгиланди");
      navigate({ to: "/admin/services" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      name,
      description: description || undefined,
      official_price: stripPrice(price),
    });
  }

  if (isLoading) return <p>Юкланмоқда...</p>;
  if (!data?.service) return <p>Хизмат топилмади</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <Card>
          <CardContent className="space-y-4">
            <FormField label="Номи" htmlFor="name">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Тавсиф" htmlFor="description" description="Хизмат ҳақида қисқача маълумот (ихтиёрий)">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <FormField label="Расмий нарх" htmlFor="price">
              <PriceInput id="price" value={price} onChange={setPrice} required />
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
