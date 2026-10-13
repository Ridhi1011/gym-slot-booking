import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from '../lib/googleIdentity.js';
import Spinner from './Spinner.jsx';

// "or" divider + Google's own button. Renders nothing when Google isn't
// configured (no VITE_GOOGLE_CLIENT_ID) or its script can't load, so the
// email/password form above always keeps working.
//
// onCredential(idToken) should return a promise (the API call).
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const container = useRef(null);
  const [status, setStatus] = useState(GOOGLE_CLIENT_ID ? 'loading' : 'off'); // loading | ready | off
  const [submitting, setSubmitting] = useState(false);

  // Keep the latest callback without re-rendering Google's button
  const callbackRef = useRef(onCredential);
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleIdentity()
      .then((gis) => {
        if (cancelled || !container.current) return;
        gis.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            setSubmitting(true);
            try {
              await callbackRef.current(credential);
            } finally {
              setSubmitting(false);
            }
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
        });
        // Google's button takes a pixel width (max 400), so match our container
        const width = Math.min(400, Math.max(200, Math.floor(container.current.offsetWidth)));
        gis.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'center',
          width,
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('off');
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (status === 'off') return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="relative mt-4 flex min-h-11 justify-center">
        {/* Google renders its accessible button (an iframe) into this div */}
        <div ref={container} className="w-full" />
        {(status === 'loading' || submitting) && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-white/80 text-sm text-slate-600">
            <Spinner className="size-4" />
            {submitting ? 'Signing in with Google…' : 'Loading Google sign-in…'}
          </div>
        )}
      </div>
    </div>
  );
}
