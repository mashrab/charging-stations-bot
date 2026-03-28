import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/shared/api/fetch";
import { setToken, setStoredUser, getRoleDashboardPath } from "@/shared/lib/auth";
import type { AuthUser } from "@/shared/lib/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PhoneInput, stripPhone } from "@/shared/ui/phone-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: stripPhone(phone), password }),
      });

      setToken(res.token);
      setStoredUser(res.user);
      navigate({ to: getRoleDashboardPath(res.user.role) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хатолик юз берди");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Dental CRM</CardTitle>
          <CardDescription>Тизимга кириш</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон рақам</Label>
              <PhoneInput
                id="phone"
                value={phone}
                onChange={setPhone}
                placeholder=""
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Парол</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Кириш..." : "Кириш"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
