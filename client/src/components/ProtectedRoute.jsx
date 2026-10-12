import { Navigate, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center text-emerald-600">
      <Spinner className="size-8" label="Loading MatSlot" />
    </div>
  );
}

// Logged-in only. With `role`, other roles are sent to their own home page.
// (This is just UX — the API checks roles on every request anyway.)
export function ProtectedRoute({ role, children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return children;
}

// Login/register: logged-in users skip straight to their home page
export function PublicOnlyRoute({ children }) {
  const { user, status } = useAuth();
  if (status === 'checking') return <FullPageSpinner />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return children;
}
