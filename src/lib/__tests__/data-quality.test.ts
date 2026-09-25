import { describe, it, expect } from 'vitest';
import { analyzeClientDatabase } from '../data-quality';

describe('Qualidade dos Dados - Inconsistências e Fila de Trabalho', () => {
  it('deve contar corretamente clientes únicos afetados por múltiplos alertas', () => {
    const clientes: any[] = [
      {
        id: 'c1',
        nome: 'Cliente Vazio', // Sem telefone, sem email, sem cidade
        whatsapp: '',
        email: '',
        cidade: '',
        cpf_cnpj: '',
      },
      {
        id: 'c2',
        nome: 'Cliente Perfeito',
        whatsapp: '11999999999',
        email: 'teste@teste.com',
        cidade: 'São Paulo',
        cpf_cnpj: '00000000000', // CPF vai dar invalido (alta)
      }
    ];

    const analysis = analyzeClientDatabase(clientes);

    // Cliente 1 terá: telefone_ausente (Alta), sem_cidade (Media), muitos_campos_vazios (Media)
    // Cliente 2 terá: cpf_cnpj_invalido (Alta)
    // Total de alertas deve ser > 2, mas clientes únicos deve ser 2
    expect(analysis.clientIssues.length).toBeGreaterThan(2);
    expect(analysis.summary.uniqueClientsWithIssues).toBe(2);
  });

  it('deve classificar corretamente as prioridades (Crítica, Alta, Média, Baixa)', () => {
    const clientes: any[] = [
      {
        id: 'c1',
        nome: 'Nome Normal',
        whatsapp: '11111111111', // Telefone com todos dígitos repetidos -> Invalido (Crítica)
      },
      {
        id: 'c2',
        nome: 'Nome Normal',
        whatsapp: '11999998888',
        email: 'email-errado', // Email invalido -> Média
      },
      {
        id: 'c3',
        nome: 'Status: Teste', // Nome suspeito -> Alta
        whatsapp: '11999998888',
      },
      {
        id: 'c4',
        nome: 'Nome com Mojibake Ã§', // Texto corrompido -> Baixa
        whatsapp: '11999998888',
      }
    ];

    const analysis = analyzeClientDatabase(clientes);

    const critica = analysis.clientIssues.find(i => i.issueType === 'telefone_invalido');
    expect(critica?.category).toBe('Critica');

    const alta = analysis.clientIssues.find(i => i.issueType === 'nome_suspeito');
    expect(alta?.category).toBe('Alta');

    const media = analysis.clientIssues.find(i => i.issueType === 'email_invalido');
    expect(media?.category).toBe('Media');

    const baixa = analysis.clientIssues.find(i => i.issueType === 'texto_corrompido');
    expect(baixa?.category).toBe('Baixa');
  });
});
