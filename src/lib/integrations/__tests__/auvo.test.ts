import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maskSecret, fetchWithRetry } from '../security';

// Mocks the global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('Security Utils - maskSecret', () => {
  it('should mask long secrets properly', () => {
    const secret = '1234567890abcdef';
    expect(maskSecret(secret)).toBe('1234****cdef');
  });

  it('should mask short secrets completely', () => {
    expect(maskSecret('1234567')).toBe('****');
    expect(maskSecret('123')).toBe('****');
  });

  it('should handle undefined or empty', () => {
    expect(maskSecret(undefined)).toBe('');
    expect(maskSecret('')).toBe('');
  });
});

describe('Security Utils - fetchWithRetry', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first try if 200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const res = await fetchWithRetry('http://test.com');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 Rate Limit', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('rate limit', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const promise = fetchWithRetry('http://test.com', { baseDelayMs: 100 });
    
    // Fast-forward timers for the exponential backoff
    await vi.advanceTimersByTimeAsync(150);

    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    fetchMock.mockResolvedValue(new Response('error', { status: 500 }));

    let caughtError: any;
    const promise = fetchWithRetry('http://test.com', { maxRetries: 2, baseDelayMs: 10 }).catch(e => caughtError = e);
    
    await vi.advanceTimersByTimeAsync(50);
    await promise;

    expect(caughtError).toBeDefined();
    expect(caughtError.message).toMatch(/Falha após 2 tentativas/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
