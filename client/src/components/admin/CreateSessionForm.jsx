import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { api } from '../../lib/api.js';
import { dayLabel, gymHourNow, gymToday } from '../../lib/time.js';
import { useToast } from '../../context/ToastContext.jsx';
import Panel from '../Panel.jsx';
import Button from '../Button.jsx';
import Field from '../Field.jsx';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const pad = (n) => String(n).padStart(2, '0');

function validate({ date, hour }) {
  const errors = {};
  const today = gymToday();
  if (!date) errors.date = 'Pick a date';
  else if (date < today) errors.date = 'That date is in the past';
  else if (date === today && Number(hour) <= gymHourNow()) errors.hour = 'That hour has already started — pick a later one';
  return errors;
}

export default function CreateSessionForm({ defaultDate, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ date: defaultDate, hour: '7' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    setErrors(validate(next));
    setServerError('');
  };

  async function onSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await api('/sessions', { method: 'POST', body: { date: form.date, hour: Number(form.hour) } });
      toast.success(`Session created: ${dayLabel(form.date)}, ${pad(form.hour)}:00.`);
      onCreated?.(form.date);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Create session" icon={CalendarPlus} id="create-heading">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field id="new-date" label="Date" type="date" min={gymToday()} value={form.date} onChange={update('date')} error={errors.date} />
          <Field id="new-hour" label="Start time (IST)" value={form.hour} onChange={update('hour')} error={errors.hour}>
            {HOURS.map((h) => (
              <option key={h} value={h}>{pad(h)}:00 – {pad((h + 1) % 24)}:00</option>
            ))}
          </Field>
        </div>
        {serverError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{serverError}</p>
        )}
        <Button type="submit" loading={submitting} className="w-full">
          Create session
        </Button>
        <p className="text-xs text-slate-500">Each session is 1 hour with 20 mats.</p>
      </form>
    </Panel>
  );
}
