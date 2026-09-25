import { describe, it, expect } from 'vitest';
import { getSecondaryCount, getAuditStatus } from '../../routes/_authenticated/dashboard.clientes.qualidade';

describe('Histórico de Mesclagens - Parse Functions', () => {
  describe('getSecondaryCount', () => {
    it('deve retornar número quando archived_ids for array válido', () => {
      expect(getSecondaryCount({ archived_ids: ['id1', 'id2'] })).toBe(2);
      expect(getSecondaryCount({ archived_ids: [] })).toBe(0);
    });

    it('deve retornar número quando campos_anteriores.secundarios for array válido (legacy)', () => {
      expect(getSecondaryCount({ campos_anteriores: { secundarios: ['id1'] } })).toBe(1);
      expect(getSecondaryCount({ campos_anteriores: { secundarios: [] } })).toBe(0);
    });

    it('deve retornar total_afetados quando existir (migration audit)', () => {
      expect(getSecondaryCount({ total_afetados: 5 })).toBe(5);
      expect(getSecondaryCount({ total_afetados: 0 })).toBe(0);
    });

    it('deve retornar null se não houver fonte', () => {
      expect(getSecondaryCount({})).toBeNull();
      expect(getSecondaryCount({ archived_ids: null })).toBeNull();
      expect(getSecondaryCount({ archived_ids: 'not-an-array' })).toBeNull();
      expect(getSecondaryCount({ campos_anteriores: {} })).toBeNull();
    });
  });

  describe('getAuditStatus', () => {
    it('deve retornar FAILED quando status for FAILED explícito', () => {
      expect(getAuditStatus({ status: 'FAILED' })).toBe('FAILED');
    });

    it('deve retornar FAILED quando contagem for 0 e não houver status (tentativa vazia/falha)', () => {
      expect(getAuditStatus({ archived_ids: [] })).toBe('FAILED');
    });

    it('deve retornar REVERTED quando houver reverted_at, preservando secundários originais', () => {
      const audit = { archived_ids: ['id1', 'id2'], reverted_at: '2026-08-14' };
      expect(getAuditStatus(audit)).toBe('REVERTED');
      expect(getSecondaryCount(audit)).toBe(2);
    });

    it('deve retornar REVERTED quando status for explícito', () => {
      expect(getAuditStatus({ status: 'UNDO_SUCCESS' })).toBe('REVERTED');
      expect(getAuditStatus({ status: 'REVERTED' })).toBe('REVERTED');
    });

    it('deve retornar PENDING quando status for PENDING', () => {
      expect(getAuditStatus({ status: 'PENDING' })).toBe('PENDING');
    });

    it('deve retornar SUCCESS quando houver evidências físicas da mesclagem (archived_ids + backups)', () => {
      // Sem coluna status, mas com evidências atômicas do RPC
      const audit = { 
        archived_ids: ['id1'], 
        campos_anteriores: { secundarios: [{ id: 'id1' }] } 
      };
      expect(getAuditStatus(audit)).toBe('SUCCESS');
    });

    it('deve retornar UNKNOWN para qualquer outro caso sem status definido ou evidências suficientes', () => {
      // Tem archived_ids, mas sem backup (impossível no RPC, mas blindado aqui)
      expect(getAuditStatus({ archived_ids: ['id1'] })).toBe('UNKNOWN');
      // Tem backup, mas sem archived_ids
      expect(getAuditStatus({ campos_anteriores: { secundarios: ['id1'] } })).toBe('UNKNOWN');
      // Objeto vazio
      expect(getAuditStatus({})).toBe('UNKNOWN');
      // Status maluco
      expect(getAuditStatus({ status: 'WEIRD_STATUS' })).toBe('UNKNOWN');
    });
  });
});
