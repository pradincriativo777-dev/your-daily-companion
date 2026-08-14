import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { serverLogin } from "@/lib/login.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JANSOL · Painel Administrativo" },
      {
        name: "description",
        content:
          "Painel administrativo interno da JANSOL para gestão de clientes, manutenções e finanças de aquecimento solar.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "JANSOL · Painel Administrativo" },
      {
        property: "og:description",
        content: "Acesso restrito ao painel interno da JANSOL.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const result = await serverLogin({ data: { email: email.trim(), password: senha } });
      if (!result.success) {
        setErro(result.error ?? "Erro ao autenticar.");
        setLoading(false);
        return;
      }
      // Set the Supabase session client-side with the server-returned tokens
      if (result.accessToken && result.refreshToken) {
        await supabase.auth.setSession({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });
      }
      setLoading(false);
      navigate({ to: "/dashboard", replace: true });
    } catch {
      setErro("Erro de conexão com o servidor.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight text-accent">
            JANSOL
          </h1>
          <p className="mt-1 text-sm tracking-widest text-muted-foreground uppercase">
            Painel Administrativo
          </p>
        </div>
        <Card className="border-border/70 shadow-sm">
          <CardContent className="pt-2">
            <form onSubmit={entrar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@jansol.com.br"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              {erro && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {erro}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito à equipe JANSOL · Campinas/SP
        </p>
      </div>
    </main>
  );
}
