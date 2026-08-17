import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { serverLogin } from "@/lib/login.server";
import { JansolSunIcon } from "@/components/layout/JansolLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JANSOL OS · Painel Operacional" },
      {
        name: "description",
        content:
          "Sistema operacional interno JANSOL para gestão de clientes, aquecimento solar, manutenções e finanças.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "JANSOL OS · Painel Operacional" },
      {
        property: "og:description",
        content: "Acesso restrito à equipe JANSOL.",
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
    <main className="flex min-h-screen items-center justify-center bg-[#1D1C19] px-4 text-[#F8F6F1] relative overflow-hidden selection:bg-[#E3B94F] selection:text-[#1D1C19]">
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#E3B94F]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#C8794A]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#292722] border border-[#E3B94F]/30 shadow-md">
            <JansolSunIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-serif-editorial text-3xl font-bold tracking-tight text-[#F8F6F1]">
              JANSOL <span className="not-italic text-[#E3B94F] text-base font-sans font-bold">OS</span>
            </h1>
            <p className="mt-1 text-xs tracking-widest text-[#99958C] uppercase font-bold">
              Tecnologia Operacional & Gestão
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-[#2B2924] bg-[#292722] p-2 shadow-xl rounded-[18px] text-[#F8F6F1]">
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={entrar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-[#DDD8CE]">E-mail corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@jansol.com.br"
                  className="rounded-[10px] border-[#38352F] bg-[#11110F] text-[#F8F6F1] placeholder:text-[#706D65] focus-visible:ring-[#E3B94F]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-xs font-bold text-[#DDD8CE]">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="rounded-[10px] border-[#38352F] bg-[#11110F] text-[#F8F6F1] focus-visible:ring-[#E3B94F]"
                />
              </div>
              {erro && (
                <p className="rounded-[10px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400 font-medium">
                  {erro}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="jansol-gradient-btn w-full h-10 font-bold tracking-wide shadow-md"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#1D1C19]" />}
                Acessar JANSOL OS
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-xs text-[#99958C]">
          <ShieldCheck className="h-4 w-4 text-[#E3B94F]" />
          <span>Acesso criptografado e restrito à equipe JANSOL</span>
        </div>
      </div>
    </main>
  );
}
