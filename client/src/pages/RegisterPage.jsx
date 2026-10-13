import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import AuthLayout, { FormError } from './AuthLayout.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the server rules so most mistakes are caught before a request
function validate({ name, email, password, confirm }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!email.trim()) errors.email = 'Enter your email';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email, like name@example.com';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (password.length > 72) errors.password = 'Password must be 72 characters or fewer';
  if (confirm !== password) errors.confirm = 'Passwords don’t match';
  return errors;
}

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    if (touched[field]) setErrors(validate(next));
  };
  const blur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(form));
  };
  const show = (field) => touched[field] && errors[field];

  async function onSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password);
      toast.success(`Welcome to MatSlot, ${user.name}!`);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  }

  // Google sign-up: an existing account with the same email is reused, otherwise a member is created
  async function onGoogleCredential(credential) {
    setServerError('');
    try {
      const user = await loginWithGoogle(credential);
      toast.success(`Welcome to MatSlot, ${user.name}!`);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Book mats, join waitlists and get your check-in code."
      footer={<>Already a member? <Link to="/login" className="font-semibold text-emerald-700 hover:underline">Log in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field id="name" label="Full name" autoComplete="name"
          value={form.name} onChange={update('name')} onBlur={blur('name')} error={show('name')} />
        <Field id="email" label="Email" type="email" autoComplete="email" inputMode="email"
          value={form.email} onChange={update('email')} onBlur={blur('email')} error={show('email')} />
        <Field id="password" label="Password" type="password" autoComplete="new-password"
          hint="At least 8 characters"
          value={form.password} onChange={update('password')} onBlur={blur('password')} error={show('password')} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password"
          value={form.confirm} onChange={update('confirm')} onBlur={blur('confirm')} error={show('confirm')} />
        <FormError message={serverError} />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <GoogleSignInButton onCredential={onGoogleCredential} text="signup_with" />
    </AuthLayout>
  );
}
