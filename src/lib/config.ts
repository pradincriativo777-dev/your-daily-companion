/**
 * Configurações Globais da Aplicação JANSOL OS.
 */

// URL Oficial do Auvo Chat / Portal Web do Auvo
export const AUVO_CHAT_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_AUVO_CHAT_URL"]) ||
  "https://app.auvo.com.br/chat";
