import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

// GETs `path` and tracks loading / error / ready. Pass null to skip.
// reload({ silent: true }) refreshes in the background without flashing skeletons
// and keeps the last good data if it fails (used for polling).
export function useApiData(path) {
  const [state, setState] = useState({ status: path ? 'loading' : 'idle', data: null, error: null });
  const latest = useRef(0); // ignore responses from requests that have been superseded

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!path) return;
    const mine = ++latest.current;
    if (!silent) setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await api(path);
      if (mine === latest.current) setState({ status: 'ready', data, error: null });
    } catch (err) {
      if (mine === latest.current && !silent) setState({ status: 'error', data: null, error: err });
    }
  }, [path]);

  useEffect(() => {
    if (path) reload();
    else setState({ status: 'idle', data: null, error: null });
  }, [path, reload]);

  return { ...state, reload };
}
