import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './context/AuthContext.jsx';
import { ProtectedRoute, PublicOnlyRoute, FullPageSpinner } from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function HomeRedirect() {
  const { user, status } = useAuth();
  if (status === 'checking') return <FullPageSpinner />;
  return <Navigate to={user ? homeFor(user) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/sessions" element={<ProtectedRoute role="member"><SessionsPage /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute role="member"><MyBookingsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
