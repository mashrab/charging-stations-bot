import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/fetch";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { PriceInput, stripPrice } from "@/shared/ui/price-input";
import { FormField } from "@/shared/ui/form-field";
import { Card, CardContent } from "@/shared/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services/new")({
  component: NewServicePage,
});

function NewServicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; official_price: number }) =>
      api("/services", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Хизмат қўшилди");
      navigate({ to: "/admin/services" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name,
      description: description || undefined,
      official_price: stripPrice(price),
    });
  }

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

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          Қўшиш
        </Button>
      </form>
    </div>
  );
}
