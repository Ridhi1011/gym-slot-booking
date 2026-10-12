const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_KEY = 'matslot.token';

// localStorage can throw (private mode, blocked storage), so never let that crash the app
export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// AuthContext registers this so a 401 anywhere logs the user out
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// api('/sessions?date=2026-10-13') or api('/checkin', { method: 'POST', body: { code } })
// Resolves with the JSON body, or throws ApiError with the server's { code, message }.
export async function api(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (res.ok) return data;

  // Only a 401 on an authenticated request means "your login is gone".
  // A 401 from the login form itself is just a wrong password.
  if (res.status === 401 && token) {
    tokenStore.clear();
    onUnauthorized();
  }

  const error = data?.error ?? {};
  throw new ApiError(res.status, error.code ?? `HTTP_${res.status}`, error.message ?? `Request failed (${res.status})`);
}
