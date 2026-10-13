// Google Identity Services (the official "Sign in with Google" button).
// ID-token flow: Google's popup hands us a signed JWT ("credential"), we send it
// to our API, and the server verifies it. No client secret, no redirect.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;

// Loads the GIS script once and resolves with window.google.accounts.id
export function loadGoogleIdentity() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google script loaded without the sign-in API')));
      script.onerror = () => reject(new Error('Could not load Google sign-in'));
      document.head.appendChild(script);
    }).catch((err) => {
      scriptPromise = null; // allow a retry on the next page visit
      throw err;
    });
  }
  return scriptPromise;
}
