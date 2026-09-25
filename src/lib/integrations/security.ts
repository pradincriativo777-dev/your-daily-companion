/**
 * Mascara strings sensíveis (tokens, senhas) para exibir em logs de forma segura.
 * Exibe apenas os primeiros 4 e últimos 4 caracteres, substituindo o meio por asteriscos.
 */
export function maskSecret(secret?: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "****";
  return `${secret.substring(0, 4)}****${secret.substring(secret.length - 4)}`;
}

interface FetchWithRetryOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Função fetch resiliente com timeout via AbortController,
 * e exponential backoff para erros HTTP 429 (Rate Limit) ou 5xx.
 */
export async function fetchWithRetry(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
  const { timeoutMs = 10000, maxRetries = 3, baseDelayMs = 1000, ...fetchOptions } = options;
  
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(id);

      // Se der Rate Limit (429) ou Erro de Servidor (500+), tentar novamente
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Transient error: ${response.status}`);
      }

      return response;
    } catch (error: any) {
      clearTimeout(id);
      
      // AbortError acontece quando o timeout estoura
      const isTimeout = error.name === 'AbortError';
      
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(`Falha após ${maxRetries} tentativas. Último erro: ${isTimeout ? 'Timeout' : error.message}`);
      }
      
      // Espera progressiva: 1s, 2s, 4s...
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  
  throw new Error("Unreachable");
}
