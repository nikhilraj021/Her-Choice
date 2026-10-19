/**
 * Thin wrapper around fetch for the Express API.
 * - Sends cookies (`credentials: 'include'`) so HTTP-only auth cookies work cross-origin.
 * - Unwraps the API envelope: resolves with `{ data, meta, message }` on success
 *   and throws ApiClientError (with the API's error code) on failure.
 *
 * Server components do not have the browser's cookies; the auth module adds
 * a server-side helper that forwards them explicitly.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiClientError extends Error {
  constructor({ status, code, message, details, requestId }) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export async function apiRequest(path, { method = 'GET', body, headers, ...init } = {}) {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured. Copy .env.example to .env.local.');
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });
  } catch {
    throw new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Please check your connection.',
    });
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const error = payload?.error;
    throw new ApiClientError({
      status: response.status,
      code: error?.code ?? 'UNEXPECTED_RESPONSE',
      message: error?.message ?? 'Unexpected response from the server',
      details: error?.details,
      requestId: error?.requestId,
    });
  }

  return { data: payload.data, meta: payload.meta, message: payload.message };
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
