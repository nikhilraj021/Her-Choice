import assert from 'node:assert/strict';
import { afterEach, before, describe, it, mock } from 'node:test';

process.env.NEXT_PUBLIC_API_URL = 'http://api.test/api/v1';

let api;
let ApiClientError;

before(async () => {
  // Imported after the env var is set because the client reads it at module load
  ({ api, ApiClientError } = await import('../../src/lib/api-client.js'));
});

afterEach(() => mock.restoreAll());

function mockFetch(status, payload) {
  return mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('api client', () => {
  it('sends cookies and JSON, and unwraps the success envelope', async () => {
    const fetchMock = mockFetch(201, { success: true, data: { id: 1 }, message: 'Created' });

    const result = await api.post('/cart/items', { productId: 1, quantity: 2 });

    assert.deepEqual(result, { data: { id: 1 }, meta: undefined, message: 'Created' });
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(url, 'http://api.test/api/v1/cart/items');
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'include');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.equal(init.body, JSON.stringify({ productId: 1, quantity: 2 }));
  });

  it('throws ApiClientError carrying the API error code', async () => {
    mockFetch(409, {
      success: false,
      error: { code: 'CONFLICT', message: 'Only 1 left in stock', requestId: 'req-123' },
    });

    await assert.rejects(api.get('/products/1'), (err) => {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.status, 409);
      assert.equal(err.code, 'CONFLICT');
      assert.equal(err.message, 'Only 1 left in stock');
      assert.equal(err.requestId, 'req-123');
      return true;
    });
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new TypeError('fetch failed');
    });

    await assert.rejects(api.get('/health'), { code: 'NETWORK_ERROR', status: 0 });
  });

  it('rejects non-envelope responses', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('<html>Bad gateway</html>', { status: 502 }));

    await assert.rejects(api.get('/health'), { code: 'UNEXPECTED_RESPONSE', status: 502 });
  });
});
