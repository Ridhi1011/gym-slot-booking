import { Link } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="animate-fade-in">
        <p className="text-sm font-semibold text-emerald-700">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-slate-500">That page doesn’t exist.</p>
        <Link
          to={user ? homeFor(user) : '/login'}
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
