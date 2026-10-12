import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import AuthLayout, { FormError } from './AuthLayout.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email, like name@example.com';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    if (touched[field]) setErrors(validate(next)); // re-check live once the field has been visited
  };
  const blur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(form));
  };

  async function onSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setTouched({ email: true, password: true });
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const user = await login(form.email.trim(), form.password);
      // Go back to the page they were trying to open, if their role allows it
      const from = location.state?.from;
      const allowed = from && (user.role === 'admin' ? from.startsWith('/admin') : !from.startsWith('/admin'));
      navigate(allowed ? from : homeFor(user), { replace: true });
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to book your next session."
      footer={<>New here? <Link to="/register" className="font-semibold text-emerald-700 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          id="email" label="Email" type="email" autoComplete="email" inputMode="email"
          value={form.email} onChange={update('email')} onBlur={blur('email')}
          error={touched.email && errors.email}
        />
        <Field
          id="password" label="Password" type="password" autoComplete="current-password"
          value={form.password} onChange={update('password')} onBlur={blur('password')}
          error={touched.password && errors.password}
        />
        <FormError message={serverError} />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
