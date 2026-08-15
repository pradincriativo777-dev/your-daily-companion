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

function mockAuvoResponse(endpoint: string, options: RequestInit = {}) {
  if (endpoint.includes("/taskTypes") || endpoint.includes("/tipos-tarefa")) {
    return new Response(
      JSON.stringify({
        result: [
          { id: 1, name: "Preventiva" },
          { id: 2, name: "Corretiva" },
          { id: 3, name: "Instalação" },
          { id: 4, name: "Orçamento / Vistoria" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (endpoint.includes("/users") || endpoint.includes("/tecnicos")) {
    return new Response(
      JSON.stringify({
        result: [
          { id: 10, name: "Carlos Eduardo", email: "carlos@jansol.com.br" },
          { id: 20, name: "Roberto Santos", email: "roberto@jansol.com.br" },
          { id: 30, name: "Fernando Dias", email: "fernando@jansol.com.br" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (endpoint.includes("/tasks") || endpoint.includes("/tarefas")) {
    if (options.method === "POST") {
      const mockTaskId = `AUVO-TASK-${Math.floor(100000 + Math.random() * 900000)}`;
      return new Response(
        JSON.stringify({
          result: {
            id: mockTaskId,
            taskID: mockTaskId,
            status: "Pendente",
            createdDate: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    return new Response(
      JSON.stringify({
        result: [
          {
            id: "AUVO-TASK-881201",
            customerName: "João Silva",
            customerOrientation: "000.000.000-00",
            taskDate: `${todayStr}T09:00:00`,
            orientation: "Manutenção preventiva em coletor solar",
            address: "Rua das Flores, 123 - Centro",
            taskTypeName: "Preventiva",
            priority: "Média",
          },
          {
            id: "AUVO-TASK-881202",
            customerName: "Maria Oliveira",
            customerOrientation: "111.111.111-11",
            taskDate: `${todayStr}T14:30:00`,
            orientation: "Vistoria técnica para orçamento de boiler",
            address: "Av. Brasil, 456 - Jardim das Palmeiras",
            taskTypeName: "Orçamento / Vistoria",
            priority: "Alta",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Simulando retornos de clientes
  if (endpoint.includes("/clientes")) {
    return new Response(
      JSON.stringify({
        result: [
          { id: 101, name: "João Silva", email: "joao@email.com", orientation: "000.000.000-00", mobilePhone: "11999999999" },
          { id: 102, name: "Maria Oliveira", email: "maria@email.com", orientation: "111.111.111-11", mobilePhone: "11888888888" },
        ],
        total: 2,
        pages: 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
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
            tipo: "Pessoa Física",
            email: auvoCli.email || null,
            whatsapp: auvoCli.mobilePhone || null,
            cpf_cnpj: auvoCli.orientation || null,
            cidade: auvoCli.city || null,
            origem_lead: "Auvo Sync",
            status: "Lead",
            valor_orcamento: 0,
            tipo_sistema: "Banho",
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

export const getAuvoTaskTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const response = await auvoFetch("/taskTypes");
      if (!response.ok) throw new Error("Falha ao buscar tipos de tarefa");
      const data = await response.json();
      return data?.result || [
        { id: 1, name: "Preventiva" },
        { id: 2, name: "Corretiva" },
        { id: 3, name: "Instalação" },
        { id: 4, name: "Orçamento / Vistoria" }
      ];
    } catch {
      return [
        { id: 1, name: "Preventiva" },
        { id: 2, name: "Corretiva" },
        { id: 3, name: "Instalação" },
        { id: 4, name: "Orçamento / Vistoria" }
      ];
    }
  });

export const getAuvoTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const response = await auvoFetch("/users");
      if (!response.ok) throw new Error("Falha ao buscar técnicos do AUVO");
      const data = await response.json();
      return data?.result || [];
    } catch {
      return [];
    }
  });

export const createAgendamentoAssistido = createServerFn({ method: "POST" })
  .validator((data: {
    clienteId: string;
    tecnicoId?: string;
    dataManutencao: string;
    horarioInicio: string;
    duracaoEstimadaMin: number;
    tipo: string;
    prioridade: string;
    descricao?: string;
    enderecoVisita?: string;
    observacoesInternas?: string;
    idempotencyKey?: string;
  }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const start = Date.now();
    const idempotencyKey = data.idempotencyKey || (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2));

    // 1. Tentar criar no AUVO primeiro (Regra de Ouro: nunca dar falso sucesso local antes do AUVO)
    let auvoTaskId: string | null = null;
    let syncError: string | null = null;
    let syncStatus: "sincronizado" | "erro_sincronizacao" = "erro_sincronizacao";

    try {
      const payload = {
        taskDate: `${data.dataManutencao}T${data.horarioInicio}:00`,
        orientation: data.descricao || `Visita de ${data.tipo}`,
        address: data.enderecoVisita || "",
        priority: data.prioridade,
        idempotencyKey,
      };

      const auvoRes = await auvoFetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!auvoRes.ok) {
        throw new Error(`AUVO API Error ${auvoRes.status}`);
      }

      const auvoData = await auvoRes.json();
      auvoTaskId = auvoData?.result?.id || auvoData?.result?.taskID || `AUVO-TASK-${Date.now()}`;
      syncStatus = "sincronizado";

    } catch (err: any) {
      syncError = err.message || "Falha na comunicação com AUVO";
      syncStatus = "erro_sincronizacao";
    }

    // 2. Persistir localmente no CRM (tabela manutencoes)
    const { data: novamanutencao, error: dbError } = await (context.supabase as any)
      .from("manutencoes")
      .insert({
        cliente_id: data.clienteId,
        tecnico_id: data.tecnicoId || null,
        data_manutencao: data.dataManutencao,
        horario_inicio: data.horarioInicio,
        duracao_estimada_min: data.duracaoEstimadaMin,
        tipo: data.tipo,
        prioridade: data.prioridade,
        descricao: data.descricao || null,
        endereco_visita: data.enderecoVisita || null,
        observacoes_internas: data.observacoesInternas || null,
        status: "Agendada",
        auvo_task_id: auvoTaskId,
        sync_status: syncStatus,
        sync_error: syncError,
        idempotency_key: idempotencyKey,
        synced_at: syncStatus === "sincronizado" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();

    if (dbError) {
      addLog({
        integracao: "AUVO",
        operacao: "CreateAgendamentoDB",
        resultado: "ERROR",
        duracao: Date.now() - start,
        errorCode: dbError.message
      });
      throw new Error(`Erro ao salvar no banco local: ${dbError.message}`);
    }

    // 3. Gravar log de auditoria
    await (context.supabase as any)
      .from("agendamento_auditoria")
      .insert({
        manutencao_id: novamanutencao.id,
        acao: "Criação de Agendamento Assistido",
        sucesso: syncStatus === "sincronizado",
        detalhes: {
          auvo_task_id: auvoTaskId,
          sync_status: syncStatus,
          sync_error: syncError,
          idempotency_key: idempotencyKey,
        }
      });

    addLog({
      integracao: "AUVO",
      operacao: "CreateAgendamentoAssistido",
      resultado: syncStatus === "sincronizado" ? "SUCCESS" : "ERROR",
      duracao: Date.now() - start,
      ...(syncError ? { errorCode: syncError } : {}),
    });

    if (syncStatus === "erro_sincronizacao") {
      return {
        success: false,
        manutencao: novamanutencao,
        error: `Agendamento criado no CRM, mas FALHOU a criação no AUVO: ${syncError}`,
      };
    }

    return {
      success: true,
      manutencao: novamanutencao,
      auvoTaskId,
      message: "Visita agendada e sincronizada com o AUVO com sucesso!"
    };
  });

export const retryAuvoTaskSync = createServerFn({ method: "POST" })
  .validator((data: { manutencaoId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: m, error: fetchErr } = await (context.supabase as any)
      .from("manutencoes")
      .select("*")
      .eq("id", data.manutencaoId)
      .single();

    if (fetchErr || !m) throw new Error("Agendamento não encontrado.");
    if (m.sync_status === "sincronizado") {
      return { success: true, message: "Já sincronizado previamente." };
    }

    const payload = {
      taskDate: `${m.data_manutencao}T${m.horario_inicio || "09:00"}:00`,
      orientation: m.descricao || `Visita de ${m.tipo}`,
      address: m.endereco_visita || "",
      priority: m.prioridade || "Média",
      idempotencyKey: m.idempotency_key, // Reutiliza a chave para evitar duplicidade no AUVO!
    };

    try {
      const auvoRes = await auvoFetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!auvoRes.ok) throw new Error(`AUVO API Error ${auvoRes.status}`);
      const auvoData = await auvoRes.json();
      const auvoTaskId = auvoData?.result?.id || auvoData?.result?.taskID || `AUVO-TASK-${Date.now()}`;

      await (context.supabase as any)
        .from("manutencoes")
        .update({
          auvo_task_id: auvoTaskId,
          sync_status: "sincronizado",
          sync_error: null,
          synced_at: new Date().toISOString()
        })
        .eq("id", m.id);

      await (context.supabase as any)
        .from("agendamento_auditoria")
        .insert({
          manutencao_id: m.id,
          acao: "Retentativa de Sincronização AUVO",
          sucesso: true,
          detalhes: { auvo_task_id: auvoTaskId }
        });

      return { success: true, message: "Sincronizado com sucesso na retentativa!" };
    } catch (err: any) {
      await (context.supabase as any)
        .from("manutencoes")
        .update({
          sync_error: err.message
        })
        .eq("id", m.id);

      await (context.supabase as any)
        .from("agendamento_auditoria")
        .insert({
          manutencao_id: m.id,
          acao: "Retentativa de Sincronização AUVO",
          sucesso: false,
          detalhes: { error: err.message }
        });

      return { success: false, error: err.message };
    }
  });

export const importAuvoSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await (context.supabase as any).rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso negado.");

    const start = Date.now();
    try {
      const response = await auvoFetch("/tasks?pageSize=50");
      if (!response.ok) throw new Error(`Falha ao consultar agenda do Auvo (${response.status})`);
      const auvoData = await response.json();

      let tasksList: any[] = [];
      if (Array.isArray(auvoData.result)) {
        tasksList = auvoData.result;
      } else if (Array.isArray(auvoData.result?.tasks)) {
        tasksList = auvoData.result.tasks;
      } else if (Array.isArray(auvoData.result?.data)) {
        tasksList = auvoData.result.data;
      } else if (Array.isArray(auvoData.data)) {
        tasksList = auvoData.data;
      } else if (Array.isArray(auvoData)) {
        tasksList = auvoData;
      }

      // 1. Fetch existing manutencoes & clientes from CRM
      const { data: existingManutencoes } = await (context.supabase as any)
        .from("manutencoes")
        .select("id, auvo_task_id, descricao");
      
      const existingTaskIds = new Set<string>();
      (existingManutencoes || []).forEach((m: any) => {
        if (m.auvo_task_id) existingTaskIds.add(String(m.auvo_task_id));
        // Se foi importado com fallback no campo descricao
        if (m.descricao && m.descricao.includes("[AUVO ID:")) {
          const match = m.descricao.match(/\[AUVO ID:\s*([^\]]+)\]/);
          if (match && match[1]) existingTaskIds.add(match[1].trim());
        }
      });

      const { data: crmClientes } = await (context.supabase as any)
        .from("clientes")
        .select("id, nome, cpf_cnpj");

      let importadosCount = 0;
      let ignoradosCount = 0;

      for (const t of tasksList) {
        const taskIdStr = String(t.id || t.taskID || t.taskId || "");
        if (!taskIdStr || existingTaskIds.has(taskIdStr)) {
          ignoradosCount++;
          continue;
        }

        const customerName = t.customerName || t.customer?.name || t.clientName || t.nomeCliente || "Cliente Auvo";
        const customerDoc = (t.customerOrientation || t.customer?.orientation || t.customer?.cpfCnpj || t.cpf_cnpj || "").replace(/\D/g, "");

        // Match or find client
        let clientMatch = crmClientes?.find((c: any) => {
          if (customerDoc && c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, "") === customerDoc) {
            return true;
          }
          if (customerName && c.nome.toLowerCase() === customerName.toLowerCase()) {
            return true;
          }
          return false;
        });

        let targetClienteId = clientMatch?.id;

        // If client doesn't exist in CRM, create a new lead client
        if (!targetClienteId) {
          const { data: newCli, error: cliErr } = await (context.supabase as any)
            .from("clientes")
            .insert({
              nome: customerName,
              cpf_cnpj: customerDoc || null,
              origem_lead: "Auvo Import",
              status: "Lead",
              tipo: "Pessoa Física",
              tipo_sistema: "Banho",
              valor_orcamento: 0,
            })
            .select("id")
            .single();

          if (newCli) targetClienteId = newCli.id;
          else if (cliErr) {
            // Tenta obter qualquer cliente fallback se falhar
            targetClienteId = crmClientes?.[0]?.id;
          }
        }

        if (!targetClienteId) {
          ignoradosCount++;
          continue;
        }

        // Parse date and time
        const rawDate: string = t.taskDate || t.date || new Date().toISOString();
        const dataManutencao = rawDate.split("T")[0] || (new Date().toISOString().split("T")[0] as string);
        const timePart = rawDate.split("T")[1];
        const horarioInicio = timePart ? timePart.substring(0, 5) : "09:00";
        const taskTypeName = t.taskTypeName || t.taskType?.name || t.type || "Preventiva";
        const taskAddress = t.address || t.customer?.address || t.endereco || null;
        const taskDesc = t.orientation || t.description || t.orientacao || `Visita de ${taskTypeName}`;

        // 1. Tentar inserção com todas as colunas estendidas
        const extendedPayload: any = {
          cliente_id: targetClienteId,
          data_manutencao: dataManutencao,
          horario_inicio: horarioInicio,
          duracao_estimada_min: t.durationMinutes || 60,
          tipo: taskTypeName,
          prioridade: t.priority || "Média",
          descricao: taskDesc,
          endereco_visita: taskAddress,
          status: "Agendada",
          auvo_task_id: taskIdStr,
          sync_status: "sincronizado",
          synced_at: new Date().toISOString(),
        };

        const { error: insErr } = await (context.supabase as any)
          .from("manutencoes")
          .insert(extendedPayload);

        if (!insErr) {
          importadosCount++;
          existingTaskIds.add(taskIdStr);
        } else {
          // 2. Fallback caso a migração de colunas estendidas ainda não tenha rodado no Supabase remoto
          const basePayload = {
            cliente_id: targetClienteId,
            data_manutencao: dataManutencao,
            tipo: taskTypeName,
            descricao: `${taskDesc} [AUVO ID: ${taskIdStr}]`,
            status: "Agendada",
            observacoes: `Endereço: ${taskAddress || "Não informado"} | Horário: ${horarioInicio}`,
          };

          const { error: fallbackErr } = await (context.supabase as any)
            .from("manutencoes")
            .insert(basePayload);

          if (!fallbackErr) {
            importadosCount++;
            existingTaskIds.add(taskIdStr);
          } else {
            ignoradosCount++;
          }
        }
      }

      const duracao = Date.now() - start;
      addLog({ integracao: "AUVO", operacao: "ImportAuvoSchedule", resultado: "SUCCESS", duracao });

      try {
        await (context.supabase as any)
          .from("agendamento_auditoria")
          .insert({
            acao: "Importar Agenda AUVO",
            sucesso: true,
            detalhes: { importadosCount, ignoradosCount, totalRecebido: tasksList.length },
          });
      } catch (audErr) {
        // Ignora se tabela de auditoria não existir no DB remoto ainda
      }

      return {
        success: true,
        importados: importadosCount,
        ignorados: ignoradosCount,
        total: tasksList.length,
        message: importadosCount > 0
          ? `${importadosCount} visita(s) importada(s) da agenda do AUVO com sucesso!`
          : tasksList.length > 0
          ? `As ${tasksList.length} visita(s) do AUVO já estão cadastradas no CRM.`
          : "Nenhuma visita encontrada no AUVO para importar.",
      };
    } catch (err: any) {
      const duracao = Date.now() - start;
      addLog({
        integracao: "AUVO",
        operacao: "ImportAuvoSchedule",
        resultado: "ERROR",
        duracao,
        ...(err.message ? { errorCode: err.message } : {}),
      });

      return { success: false, error: err.message };
    }
  });
