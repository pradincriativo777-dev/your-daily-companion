-- ==============================================================================
-- MIGRAÇÃO DE DADOS DE DEMONSTRAÇÃO E TESTE DO FUNIL DE VENDAS JANSOL OS
-- ==============================================================================

-- 1. Inserir Técnicos Padrão se não existirem
INSERT INTO public.tecnicos (id, nome, especialidade, status, telefone)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Carlos Silva (Instalação)', 'Instalação', 'Ativo', '(24) 99888-1111'),
  ('a0000000-0000-0000-0000-000000000002', 'Marcos Oliveira (Manutenção)', 'Manutenção', 'Ativo', '(24) 99777-2222'),
  ('a0000000-0000-0000-0000-000000000003', 'Rafael Souza (Geral)', 'Ambos', 'Ativo', '(24) 99666-3333')
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir 19 Clientes Distribuídos nas 5 Etapas do Funil de Vendas
INSERT INTO public.clientes (
  id, nome, tipo, cpf_cnpj, whatsapp, email, endereco, cidade,
  tipo_telhado, tipo_sistema, qtd_pessoas, tamanho_piscina_m2, qtd_banheiros,
  marca_equipamento, qtd_coletores, modelo_reservatorio, data_instalacao,
  tecnico_id, valor_orcamento, valor_pago, status, origem_lead,
  observacoes, origem_importacao, arquivado
)
VALUES
  -- ETAPA: ORÇAMENTO (5 Leads em negociação)
  (
    'c0000000-0000-0000-0000-000000000001',
    'Residencial Quinta dos Ipês (Carlos Eduardo)',
    'Pessoa Física', '123.456.789-01', '(24) 99812-3401', 'carlos.ipes@gmail.com',
    'Rua dos Jacarandás, 145 - Alphaville', 'Resende', 'Cerâmico', 'Banho',
    4, NULL, 3, 'Termomax', 4, 'Boiler 400L Alta Pressão', NULL,
    'a0000000-0000-0000-0000-000000000001', 9800.00, 0.00, 'Orçamento', 'Google',
    'Cliente solicitou orçamento para aquecimento solar de banho com 4 placas. Aguardando retorno da proposta.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Pousada Recanto da Serra (Juliana Torres)',
    'Pessoa Jurídica', '34.567.890/0001-12', '(24) 99723-4512', 'contato@pousadarecanto.com.br',
    'Estrada das Três Cachoeiras, 800 - Penedo', 'Itatiaia', 'Laje', 'Piscina',
    NULL, 45, NULL, 'Solarem', 12, 'Controlador Digital Tholz', NULL,
    'a0000000-0000-0000-0000-000000000002', 18500.00, 0.00, 'Orçamento', 'Indicação',
    'Aquecimento solar para piscina de 45m² na pousada. Visita técnica realizada com sucesso.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'Dr. Roberto Albuquerque',
    'Pessoa Física', '234.567.890-12', '(24) 98834-5623', 'roberto.albuquerque@cardio.med.br',
    'Av. Cel. Mendes, 1020 - Manejo', 'Resende', 'Cerâmico', 'Ambos',
    5, 32, 4, 'Solis', 10, 'Boiler 600L + Placas Piscina', NULL,
    'a0000000-0000-0000-0000-000000000003', 27900.00, 0.00, 'Orçamento', 'WhatsApp',
    'Projeto completo de Banho + Piscina para residência de alto padrão.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'Condomínio Residencial Bella Città',
    'Pessoa Jurídica', '45.678.901/0001-23', '(24) 99945-6734', 'sindico@bellacitta.com.br',
    'Rua Projetada A, 50 - Vivendas', 'Porto Real', 'Laje', 'Piscina',
    NULL, 70, NULL, 'Solarem', 18, 'Sistema Central Coletivo', NULL,
    'a0000000-0000-0000-0000-000000000001', 32000.00, 0.00, 'Orçamento', 'Site',
    'Orçamento enviado para votação em assembleia condominial.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'Mariana Vasconcellos Costa',
    'Pessoa Física', '345.678.901-23', '(24) 98156-7845', 'mari.vasconcellos@hotmail.com',
    'Rua 33, nº 210 - Vila Santa Cecília', 'Volta Redonda', 'Fibrocimento', 'Banho',
    3, NULL, 2, 'Termomax', 3, 'Boiler 300L Baixa Pressão', NULL,
    'a0000000-0000-0000-0000-000000000002', 7600.00, 0.00, 'Orçamento', 'Google',
    'Cliente em dúvida entre 300L e 400L. Agendada ligação para quinta-feira.',
    'SEED_TESTE_FUNIL', false
  ),

  -- ETAPA: APROVADO (4 Clientes com Venda Fechada / Aguardando Instalação)
  (
    'c0000000-0000-0000-0000-000000000006',
    'Clínica de Estética FisioLife (Dra. Camila)',
    'Pessoa Jurídica', '56.789.012/0001-34', '(24) 99267-8956', 'contato@fisioliferesende.com.br',
    'Rua Alfredo Whately, 88 - Campos Elíseos', 'Resende', 'Laje', 'Banho',
    10, NULL, 5, 'Termomax', 6, 'Boiler 600L Inox 316', NULL,
    'a0000000-0000-0000-0000-000000000001', 15400.00, 7700.00, 'Aprovado', 'Indicação',
    'Contrato assinado. 50% de entrada pago. Aguardando chegada dos coletores.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    'Engenheiro Marcos Aurélio Prado',
    'Pessoa Física', '456.789.012-34', '(24) 98878-9067', 'marcos.aurelio.prado@eng.br',
    'Alameda das Acácias, 310 - Jardim Jalisco', 'Resende', 'Cerâmico', 'Ambos',
    5, 38, 4, 'Solis', 12, 'Boiler 500L + 12 Placas Piscina', NULL,
    'a0000000-0000-0000-0000-000000000003', 26500.00, 13250.00, 'Aprovado', 'WhatsApp',
    'Instalação aprovada. Cronograma alinhado para próxima semana.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    'Academia Hidro & Fitness (Prof. Fernando)',
    'Pessoa Jurídica', '67.890.123/0001-45', '(24) 99989-0178', 'diretoria@hidrofitness.com.br',
    'Av. Almirante Adalberto de Barros Nunes, 1500 - Niteroi', 'Volta Redonda', 'Fibrocimento', 'Piscina',
    NULL, 60, NULL, 'Solarem', 20, 'Bateria de 20 Coletores Polipropileno', NULL,
    'a0000000-0000-0000-0000-000000000001', 29800.00, 14900.00, 'Aprovado', 'Google',
    'Projeto aprovado pela diretoria. Instalação prevista para a primeira quinzena.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000009',
    'Beatriz Nogueira Silveira',
    'Pessoa Física', '567.890.123-45', '(24) 98190-1289', 'bia.nogueira@gmail.com',
    'Rua José Alves Pimenta, 77 - Centro', 'Barra Mansa', 'Cerâmico', 'Banho',
    4, NULL, 2, 'Termomax', 4, 'Boiler 400L Termomax', NULL,
    'a0000000-0000-0000-0000-000000000002', 10200.00, 5100.00, 'Aprovado', 'Site',
    'Aguardando confirmação de data da equipe técnica.',
    'SEED_TESTE_FUNIL', false
  ),

  -- ETAPA: INSTALADO (4 Clientes com Sistema em Funcionamento)
  (
    'c0000000-0000-0000-0000-000000000010',
    'Sítio Vale das Palmeiras (Luciano Meirelles)',
    'Pessoa Física', '678.901.234-56', '(24) 99801-2390', 'luciano.meirelles@fazenda.com.br',
    'Estrada Parque Nacional, Km 4 - Maromba', 'Itatiaia', 'Cerâmico', 'Ambos',
    6, 40, 4, 'Solis', 14, 'Boiler 600L + Placas Solis', '2026-03-10',
    'a0000000-0000-0000-0000-000000000003', 28400.00, 28400.00, 'Instalado', 'Indicação',
    'Instalação realizada com êxito. Sistema operando em temperatura ideal de 42°C.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000011',
    'Restaurante & Hotel Fazenda Solar do Lago',
    'Pessoa Jurídica', '78.901.234/0001-56', '(24) 99712-3401', 'gerencia@solardolago.com.br',
    'Rodovia Presidente Dutra, Km 298 - Polo Industrial', 'Porto Real', 'Laje', 'Banho',
    15, NULL, 8, 'Termomax', 8, 'Boiler 1000L Inox Industrial', '2026-02-18',
    'a0000000-0000-0000-0000-000000000001', 34500.00, 34500.00, 'Instalado', 'Google',
    'Sistema solar termossifão de alta capacidade para a cozinha e vestiários dos funcionários.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000012',
    'Renata Fagundes Moreira',
    'Pessoa Física', '789.012.345-67', '(24) 98823-4512', 'renata.moreira@uol.com.br',
    'Rua Dr. Saturnino, 55 - Centro Histórico', 'Resende', 'Cerâmico', 'Piscina',
    NULL, 28, NULL, 'Solarem', 8, 'Controlador Digital Tholz', '2026-03-01',
    'a0000000-0000-0000-0000-000000000002', 13900.00, 13900.00, 'Instalado', 'WhatsApp',
    'Piscina aquecida a 31°C no primeiro dia de sol. Cliente super satisfeita.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000013',
    'Condomínio Edifício Panorama',
    'Pessoa Jurídica', '89.012.345/0001-67', '(24) 99134-5623', 'administracao@panorama.com.br',
    'Rua São Sebastião, 400 - Ano Bom', 'Barra Mansa', 'Laje', 'Banho',
    20, NULL, 10, 'Termomax', 10, 'Boiler 800L Coletivo', '2026-01-25',
    'a0000000-0000-0000-0000-000000000001', 29000.00, 29000.00, 'Instalado', 'Indicação',
    'Instalação concluída no terraço com estrutura de reforço metálico.',
    'SEED_TESTE_FUNIL', false
  ),

  -- ETAPA: EM MANUTENÇÃO (3 Clientes em Revisão/Chamado)
  (
    'c0000000-0000-0000-0000-000000000014',
    'Haroldo Paiva Guimarães (Casa Penedo)',
    'Pessoa Física', '890.123.456-78', '(24) 99245-6734', 'haroldo.guimaraes@terra.com.br',
    'Alameda dos Pinheiros, 89 - Penedo', 'Itatiaia', 'Cerâmico', 'Banho',
    4, NULL, 3, 'Termomax', 4, 'Boiler 400L Termomax', '2025-06-15',
    'a0000000-0000-0000-0000-000000000002', 9400.00, 9400.00, 'Em Manutenção', 'Google',
    'Troca de resistência elétrica e limpeza periódica dos coletores solares.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000015',
    'Espaço Aquático Onda Viva',
    'Pessoa Jurídica', '90.123.456/0001-78', '(24) 99856-7845', 'contato@ondaviva.com.br',
    'Av. Paulo de Frontin, 720 - Aterrado', 'Volta Redonda', 'Fibrocimento', 'Piscina',
    NULL, 50, NULL, 'Solarem', 16, 'Quadro de Comando Tholz', '2025-04-10',
    'a0000000-0000-0000-0000-000000000002', 24000.00, 24000.00, 'Em Manutenção', 'Indicação',
    'Substituição de válvula eliminadora de ar e revisão dos sensores térmicos.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000016',
    'Dr. André Villas Bôas',
    'Pessoa Física', '901.234.567-89', '(24) 98167-8956', 'andre.villas@adv.br',
    'Rua do Rosário, 310 - Centro', 'Resende', 'Cerâmico', 'Ambos',
    4, 30, 3, 'Solis', 10, 'Boiler 500L Solis', '2025-08-20',
    'a0000000-0000-0000-0000-000000000003', 22800.00, 22800.00, 'Em Manutenção', 'WhatsApp',
    'Manutenção preventiva anual: verificação de anodo de sacrifício e drenagem do reservatório.',
    'SEED_TESTE_FUNIL', false
  ),

  -- ETAPA: FINALIZADO (3 Clientes Concluídos / Pós-Venda)
  (
    'c0000000-0000-0000-0000-000000000017',
    'Clube Campestre de Resende',
    'Pessoa Jurídica', '01.234.567/0001-89', '(24) 99978-9067', 'secretaria@clubecampestre.com.br',
    'Estrada Resende-Riachuelo, Km 2 - Morada da Colina', 'Resende', 'Laje', 'Piscina',
    NULL, 85, NULL, 'Solarem', 24, 'Bateria de 24 Placas Solarem', '2025-11-12',
    'a0000000-0000-0000-0000-000000000001', 38900.00, 38900.00, 'Finalizado', 'Indicação',
    'Projeto e instalação de grande porte entregues no prazo. Termo de garantia assinado.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000018',
    'Patrícia Toledo Albuquerque',
    'Pessoa Física', '012.345.678-90', '(24) 98889-0178', 'patricia.toledo@gmail.com',
    'Rua 21 de Abril, 112 - Barbará', 'Barra Mansa', 'Cerâmico', 'Banho',
    4, NULL, 2, 'Termomax', 4, 'Boiler 400L Termomax', '2025-10-05',
    'a0000000-0000-0000-0000-000000000002', 11000.00, 11000.00, 'Finalizado', 'Site',
    'Cliente finalizou pagamento e elogiou a agilidade da equipe.',
    'SEED_TESTE_FUNIL', false
  ),
  (
    'c0000000-0000-0000-0000-000000000019',
    'Residencial Recanto das Águas (Gabriel Diniz)',
    'Pessoa Física', '123.098.456-11', '(24) 99190-1289', 'gabriel.diniz@eng.com',
    'Rua das Palmeiras, 45 - Village', 'Porto Real', 'Laje', 'Ambos',
    5, 35, 4, 'Solis', 12, 'Boiler 500L + Placas Solis', '2025-09-18',
    'a0000000-0000-0000-0000-000000000003', 25700.00, 25700.00, 'Finalizado', 'Google',
    'Garantia de 3 anos entregue. Cliente indicou dois novos vizinhos.',
    'SEED_TESTE_FUNIL', false
  )
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  status = EXCLUDED.status,
  valor_orcamento = EXCLUDED.valor_orcamento,
  valor_pago = EXCLUDED.valor_pago,
  cidade = EXCLUDED.cidade,
  tipo_sistema = EXCLUDED.tipo_sistema,
  observacoes = EXCLUDED.observacoes,
  arquivado = false;
