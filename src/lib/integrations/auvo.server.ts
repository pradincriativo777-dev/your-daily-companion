import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchWithRetry, maskSecret } from "./security";

// Ephemeral in-memory logs for this prototyping phase
interface LogEntry {
  id: string;
  data: string;
  integracao: string;
  operacao: string;
  resultado: "SUCCESS" | "ERROR" | "INFO";
  duracao: number;
  errorCode?: string;
  detalhes?: any;
}

const auvoLogs: LogEntry[] = [];

function addLog(log: Omit<LogEntry, "id" | "data">) {
  const newLog = {
    ...log,
    id: Math.random().toString(36).substring(7),
    data: new Date().toISOString(),
  };
  auvoLogs.unshift(newLog);
  if (auvoLogs.length > 100) auvoLogs.pop();
}

function getAuvoCredentials() {
  const appKey = process.env['AUVO_APP_KEY'];
  const token = process.env['AUVO_TOKEN'];
  return { appKey, token };
}

// Emula a obtenção de token de acesso (Bearer) ou apenas retorna as keys para uso no header
// Baseado na V2 do AUVO
async function auvoFetch(endpoint: string, options: RequestInit = {}) {
  const { appKey, token } = getAuvoCredentials();
  if (!appKey || !token) {
    throw new Error("Credenciais AUVO_APP_KEY ou AUVO_TOKEN não configuradas no servidor.");
  }

  const baseUrl = "https://app.auvo.com.br/api/v2";

  // Vamos mockar o retorno caso as credenciais sejam "MOCK_KEY" para facilitar os testes se não tivermos a real
  if (appKey === "MOCK_KEY" && token === "MOCK_TOKEN") {
    return mockAuvoResponse(endpoint);
  }

  // Tenta autenticação oficial v2 enviando apiKey e apiToken para /login
  try {
    const loginRes = await fetchWithRetry(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: appKey, apiToken: token }),
      timeoutMs: 10000,
      maxRetries: 1,
    });

    if (loginRes.ok) {
      const loginData = await loginRes.json();
      const accessToken = loginData?.result?.accessToken;
      if (accessToken) {
        const headers = new Headers(options.headers);
        headers.set("Content-Type", "application/json");
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetchWithRetry(`${baseUrl}${endpoint}`, {
          ...options,
          headers,
          timeoutMs: 15000,
          maxRetries: 3,
        });
      }
    }
  } catch (e) {
    // Fallback se /login falhar ou se as chaves forem passadas diretamente no header
  }

  const url = `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("apiKey", appKey);
  headers.set("apiToken", token);

  return fetchWithRetry(url, {
    ...options,
    headers,
    timeoutMs: 15000,
    maxRetries: 3,
  });
}

function mockAuvoResponse(endpoint: string) {
  // Simulando retornos de sucesso paginados
  if (endpoint.includes("/clientes")) {
    return new Response(JSON.stringify({
      result: [
        { id: 101, name: "João Silva", email: "joao@email.com", orientation: "000.000.000-00", mobilePhone: "11999999999" },
        { id: 102, name: "Maria Oliveira", email: "maria@email.com", orientation: "111.111.111-11", mobilePhone: "11888888888" }
      ],
      total: 2,
      pages: 1
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ result: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export const testAuvoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Apenas admins
    const { data: isAdmin } = await (context.supabase as any).rpc('is_admin');
    if (!isAdmin) throw new Error("Apenas administradores podem testar integrações.");

    const start = Date.now();
    try {
      // 1. Validar presença das variáveis
      const { appKey, token } = getAuvoCredentials();
      if (!appKey || !token) {
        throw new Error("MissingCredentials");
      }

      // 2. Tentar fetch em um endpoint de leitura (ex: clientes com limit 1)
      const response = await auvoFetch("/clientes?pageSize=1");
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("InvalidCredentials");
        }
        throw new Error(`ApiError_${response.status}`);
      }

      // Conexão ok
      const duracao = Date.now() - start;
      addLog({ integracao: "AUVO", operacao: "TestConnection", resultado: "SUCCESS", duracao });

      return { success: true, message: "Conectado com sucesso!" };

    } catch (err: any) {
      const duracao = Date.now() - start;
      let safeErrorCode = "UnknownError";
      
      if (err.message.includes("MissingCredentials")) safeErrorCode = "MISSING_CREDENTIALS";
      else if (err.message.includes("InvalidCredentials")) safeErrorCode = "AUTH_ERROR";
      else if (err.message.includes("Timeout")) safeErrorCode = "TIMEOUT";
      else safeErrorCode = "UNAVAILABLE";

      addLog({ 
        integracao: "AUVO", 
        operacao: "TestConnection", 
        resultado: "ERROR", 
        duracao, 
        errorCode: safeErrorCode 
      });

      return { success: false, error: safeErrorCode };
    }
  });

export const simulateAuvoSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await (context.supabase as any).rpc('is_admin');
    if (!isAdmin) throw new Error("Acesso negado.");

    const start = Date.now();
    try {
      // Fetch amostra do AUVO
      const response = await auvoFetch("/clientes?pageSize=10");
      if (!response.ok) throw new Error("Falha na API");
      const auvoData = await response.json();

      // Fetch clientes do CRM para cruzar
      const { data: crmClientes } = await (context.supabase as any).from("clientes").select("id, cpf_cnpj, email, whatsapp");

      const resultados = {
        vinculados: 0,
        provaveis: 0,
        novos: 0,
        conflitos: 0,
        invalidos: 0,
      };

      const preview: any[] = [];

      (auvoData.result || []).forEach((auvoCli: any) => {
        // DRY RUN LOGIC
        // Não temos auvo_id real ainda, simulamos correspondência provável por documento/telefone/email
        const docNormalizado = auvoCli.orientation?.replace(/\D/g, '');
        const foneNormalizado = auvoCli.mobilePhone?.replace(/\D/g, '');
        const emailNormalizado = auvoCli.email?.toLowerCase();

        let encontrado = crmClientes?.find((c: any) => 
          (c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === docNormalizado) ||
          (c.email && c.email.toLowerCase() === emailNormalizado) ||
          (c.whatsapp && c.whatsapp.replace(/\D/g, '') === foneNormalizado)
        );

        if (encontrado) {
          resultados.provaveis++;
          preview.push({ auvoId: auvoCli.id, status: "Correspondência Provável", crmId: encontrado.id, matchReason: "Documento/Email/Telefone" });
        } else {
          if (!docNormalizado && !foneNormalizado && !emailNormalizado) {
            resultados.invalidos++;
            preview.push({ auvoId: auvoCli.id, status: "Inválido", matchReason: "Dados insuficientes" });
          } else {
            resultados.novos++;
            preview.push({ auvoId: auvoCli.id, status: "Novo no CRM", matchReason: "Nenhum vínculo encontrado" });
          }
        }
      });

      const duracao = Date.now() - start;
      addLog({ integracao: "AUVO", operacao: "SimulateSync", resultado: "SUCCESS", duracao });

      return { success: true, totais: resultados, preview };
    } catch (err: any) {
      const duracao = Date.now() - start;
      addLog({ integracao: "AUVO", operacao: "SimulateSync", resultado: "ERROR", duracao, errorCode: "SYNC_FAILED" });
      return { success: false, error: err.message };
    }
  });

export const executeAuvoSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await (context.supabase as any).rpc('is_admin');
    if (!isAdmin) throw new Error("Acesso negado.");

    const start = Date.now();
    try {
      const response = await auvoFetch("/clientes?pageSize=50");
      if (!response.ok) throw new Error("Falha ao consultar API Auvo");
      const auvoData = await response.json();

      const { data: crmClientes } = await (context.supabase as any)
        .from("clientes")
        .select("id, cpf_cnpj, email, whatsapp");

      let importadosCount = 0;
      let ignoradosCount = 0;

      const clientesParaInserir: any[] = [];

      (auvoData.result || []).forEach((auvoCli: any) => {
        const docNormalizado = auvoCli.orientation?.replace(/\D/g, '');
        const foneNormalizado = auvoCli.mobilePhone?.replace(/\D/g, '');
        const emailNormalizado = auvoCli.email?.toLowerCase();

        let encontrado = crmClientes?.find((c: any) => 
          (c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === docNormalizado) ||
          (c.email && c.email.toLowerCase() === emailNormalizado) ||
          (c.whatsapp && c.whatsapp.replace(/\D/g, '') === foneNormalizado)
        );

        if (!encontrado) {
          clientesParaInserir.push({
            nome: auvoCli.name || "Cliente Auvo",
            email: auvoCli.email || null,
            whatsapp: auvoCli.mobilePhone || null,
            cpf_cnpj: auvoCli.orientation || null,
            cidade: auvoCli.city || null,
            uf: auvoCli.state || null,
            origem: "Auvo Sync",
            status: "Lead",
          });
        } else {
          ignoradosCount++;
        }
      });

      if (clientesParaInserir.length > 0) {
        const { error, data } = await (context.supabase as any)
          .from("clientes")
          .insert(clientesParaInserir)
          .select("id");

        if (error) throw new Error(`Erro ao salvar no CRM: ${error.message}`);
        importadosCount = data?.length || 0;
      }

      const duracao = Date.now() - start;
      addLog({ integracao: "AUVO", operacao: "ExecuteSync", resultado: "SUCCESS", duracao });

      return { 
        success: true, 
        importados: importadosCount, 
        ignorados: ignoradosCount,
        message: `${importadosCount} cliente(s) importado(s) com sucesso!`
      };
    } catch (err: any) {
      const duracao = Date.now() - start;
      addLog({ integracao: "AUVO", operacao: "ExecuteSync", resultado: "ERROR", duracao, errorCode: "SYNC_EXECUTION_FAILED" });
      return { success: false, error: err.message };
    }
  });

export const getAuvoLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await (context.supabase as any).rpc('is_admin');
    if (!isAdmin) throw new Error("Acesso negado.");
    
    // Retorna cópia dos logs sem expor credenciais (o log em si já não tem credenciais)
    return auvoLogs;
  });

// Endpoint para verificar o status e chaves configuradas (sem expor as chaves reais)
export const getIntegrationsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { appKey, token } = getAuvoCredentials();
    const auvoConfigured = !!appKey && !!token;
    
    // Podemos determinar o status baseado no último log de conexão, se houver
    const ultimoTeste = auvoLogs.find(l => l.operacao === "TestConnection");
    let auvoStatus = "Não configurada";
    if (auvoConfigured) auvoStatus = "Configurada";
    if (ultimoTeste) {
      if (ultimoTeste.resultado === "SUCCESS") auvoStatus = "Conectada";
      else if (ultimoTeste.errorCode === "AUTH_ERROR") auvoStatus = "Erro de autenticação";
      else auvoStatus = "Indisponível";
    }

    return {
      auvo: {
        status: auvoStatus,
        configured: auvoConfigured,
        lastCheck: ultimoTeste?.data || null,
        requiredEnvVars: ["AUVO_APP_KEY", "AUVO_TOKEN"]
      },
      contaAzul: { status: "Em breve", configured: false },
      microsoft: { status: "Em breve", configured: false }
    };
  });
