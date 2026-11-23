import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@common/pages/LoginPage';
import { SignupPage } from '@common/pages/SignupPage';
import { useAuthStore } from '@common/stores/authStore';
import { AgentPage } from './pages/AgentPage';
import { ServerListPage } from './pages/ServerListPage';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    window.location.href = '/server/login?redirect=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage signupUrl="/server/signup" defaultRedirect="/server/" />} />
      <Route path="/signup" element={<SignupPage loginUrl="/server/login" />} />
      <Route path="/" element={<RequireAuth><ServerListPage /></RequireAuth>} />
      <Route path="/agents" element={<RequireAuth><AgentPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
