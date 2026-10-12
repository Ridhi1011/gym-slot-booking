import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

export default function CopyButton({ text, label }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Copied ${text}`);
    } catch {
      // Clipboard API needs https or localhost; the code is on screen anyway
      toast.error('Couldn’t copy automatically — please copy the code by hand.');
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      {copied ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
