import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'checking' while we validate a saved token on first load
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'checking' : 'ready'));

  // Any 401 from the API (expired token, deleted user) drops us back to logged out
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    if (status !== 'checking') return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setStatus('ready'));
  }, [status]);

  const handleAuth = useCallback((data) => {
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(handleAuth),
    [handleAuth],
  );

  const register = useCallback(
    (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password } }).then(handleAuth),
    [handleAuth],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Where each role lands after login
export const homeFor = (user) => (user?.role === 'admin' ? '/admin' : '/sessions');
