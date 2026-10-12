import { useState } from 'react';
import { CircleCheck, CircleX, ScanLine } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatTimeRange } from '../../lib/time.js';
import Panel from '../Panel.jsx';
import Button from '../Button.jsx';
import Field from '../Field.jsx';

// Same alphabet as the server: no 0/O, 1/I/L
const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

export default function CheckInBox({ onCheckedIn }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { ok: true, checkin } | { ok: false, message, code }
  const [submitting, setSubmitting] = useState(false);

  function onChange(e) {
    // Uppercase as they type and drop spaces/dashes people add when reading codes out
    setCode(e.target.value.toUpperCase().replace(/[\s-]/g, '').slice(0, 6));
    setError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (code.length !== 6) return setError('Codes are 6 characters long');
    if (!CODE_RE.test(code)) return setError('Codes never contain 0, O, 1, I or L — check for typos');

    setSubmitting(true);
    setResult(null);
    try {
      const { checkin } = await api('/checkin', { method: 'POST', body: { code } });
      setResult({ ok: true, checkin });
      setCode('');
      onCheckedIn?.();
    } catch (err) {
      setResult({ ok: false, message: err.message, code });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Check in" icon={ScanLine} id="checkin-heading">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Field
          id="checkin-code"
          label="Member’s code"
          className="flex-1"
          value={code}
          onChange={onChange}
          error={error}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. 7KQ2MX"
          style={{ letterSpacing: '0.2em', fontFamily: 'ui-monospace, monospace' }}
        />
        <Button type="submit" loading={submitting} className="sm:mt-[1.625rem]">
          Check in
        </Button>
      </form>

      {/* Announced to screen readers when it changes */}
      <div aria-live="polite" className="mt-4">
        {result?.ok && (
          <div className="flex animate-fade-in items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CircleCheck className="size-6 shrink-0 animate-pop text-emerald-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-emerald-900">Checked in: {result.checkin.memberName}</p>
              <p className="text-sm text-emerald-800">Session {formatTimeRange(result.checkin.sessionStartsAt)}</p>
            </div>
          </div>
        )}
        {result && !result.ok && (
          <div className="flex animate-fade-in items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <CircleX className="size-6 shrink-0 text-rose-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-rose-900">Not checked in ({result.code})</p>
              <p className="text-sm text-rose-800">{result.message}</p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
