# Revisão preventiva de segurança — 2026-10-23

Alterações preparadas para revisão. Nenhum deploy, merge, serviço de produção ou banco remoto foi utilizado.

## Dependências

- TanStack React Start 1.168.60, React Router 1.170.41, Router Plugin 1.168.42 e start-server-core 1.169.39 alinhados.
- Seroval >=1.6.7 <2: Bun resolveu 1.7.0; npm/pnpm resolveram 1.7.1. Ambos estão acima da correção 1.6.3.
- Vite >=8.2.4 <9: locks resolveram 8.3.5.
- Node.js mínimo declarado 22.12.0; verificações locais utilizaram Node.js 24.19.0.
- Locks existentes regenerados com scripts de instalação desativados. Não executar gerenciadores diferentes simultaneamente no mesmo checkout.
- Ferramentas: Bun 1.4.4, npm 11.9.0 e pnpm 10.18.3. Diferenças compatíveis de dependências transitivas entre gerenciadores ainda existem.

Fontes oficiais: [TanStack CVE-2026-102989](https://tanstack.com/blog/tanstack-start-security-update-cve-2026-102989), [Seroval](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-jp82-f5mq-hwhp), [Vite](https://github.com/vitejs/vite/security/advisories/GHSA-9jrq-w75r-8gcw).

## Método e limites

Orientações do [Cloudflare Security Audit](https://github.com/cloudflare/security-audit-skill) aplicadas à revisão e à verificação independente. Este documento não é uma execução completa das seis fases da skill.

Builds e testes executados em cópias descartáveis por bubblewrap: sem rede externa, ambiente limpo com valores permitidos, código-fonte/dependências/toolchain somente leitura, escrita em tmpfs de 1 GiB, CPU 120 s por processo, limite de 128 processos/threads, arquivos de até 64 MiB, timeout 180 s, heap Node de 768 MiB e espaço virtual de até 16 GiB. Caches de build apontam exclusivamente para o scratch. Nenhum artefato gerado foi publicado.

Nenhuma versão efetivamente em produção, política de borda ou configuração de provedores foi observada. Nitro beta, ESLint 9 e Recharts 2 foram preservados; migrações maiores exigem trabalho separado.

## Verificações

- Build completo cliente/SSR/Nitro: passou, com aviso preexistente de ordem de @import CSS.
- `test:security`: 5 testes passaram.
- `test:security:db`: fixture PostgreSQL em memória passou, incluindo negação de RPCs e preservação da mesclagem autorizada.
- `typecheck:security`: passou.
- TypeScript completo: bloqueado por cinco erros no módulo financeiro não alterado.
- Revisão independente de código, SQL e versões: concluída.


## Correções do CRM

- Operações administrativas Auvo e gestão de usuários exigem um perfil único de Administrador ativo vinculado ao usuário autenticado. Falhas de consulta negam acesso.
- Removido bootstrap que gravava um perfil administrativo durante uma consulta GET. Provisionamento inicial passa a ser uma ação explícita do proprietário.
- Payload de importação corrigido para `insercoes`; validação real de UUIDs e arrays; limite de 1.000 registros por requisição e arquivo de até 10 MiB.
- SheetJS atualizado para 0.20.3 pela [distribuição oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), com integridade nos locks.
- Nova migração restaura `is_admin()` baseado em perfil ativo, protege RPCs de mesclagem com sessão/identidade/ACLs, fixa search_path e registra os campos obrigatórios de arquivamento.

## Impeditivos de liberação do CRM

**Não aplicar automaticamente a migração nem publicar somente o código.** O middleware consulta `perfis_usuarios`; enquanto a política antiga permissiva estiver aplicada, essa tabela pode continuar modificável por usuários comuns.

1. O proprietário precisa verificar, por meios próprios, quais identidades realmente devem ser administradoras. O preflight verifica existência e duplicidade, não legitimidade. Não apagar evidências ou perfis automaticamente.
2. A migração restaura a política administrativa anterior das cinco tabelas principais. Ela restringe os demais perfis. Validar a matriz de acesso do produto antes de aprovar liberação ou substituir por políticas granulares testadas.
3. A migração aborta se não existir administrador ativo ou houver perfis duplicados. Não há fallback de promoção automática.
4. `execute_batch_import_transaction`, `undo_batch_import_transaction` e RPCs de correção não possuem definições nas migrações versionadas consultadas. Confirmar existência, ACLs, autorização interna e contrato em homologação; não presumir que o ajuste de payload comprove importação ponta a ponta.
5. A checagem TypeScript completa aponta cinco erros em `dashboard.financeiro.tsx` (tipos de tabela/campos/propriedades), arquivo não alterado neste trabalho. A checagem específica de segurança e os testes não substituem resolver essas pendências.

## Comandos de validação local

Usar ambiente isolado e dependências já instaladas, sem credenciais reais:

- `npm run test:security`: testes de autorização e contrato de importação.
- `npm run test:security:db`: PostgreSQL WASM em memória (PGlite), usuários e registros fictícios, sem URL de banco.
- `npm run typecheck:security`: módulos administrativos alterados.
- `npm run typecheck`: projeto completo.
- `npm run build`: artefatos somente locais.

O fixture SQL reproduz a configuração permissiva anterior e valida a correção. Ele não replica todos os componentes e controles de uma implantação Supabase real.
