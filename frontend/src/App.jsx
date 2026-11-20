import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import { LoadingScreen } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Login            from './pages/auth/Login.jsx';
import ForgotPassword   from './pages/auth/ForgotPassword.jsx';
import Dashboard        from './pages/Dashboard.jsx';
import Clients          from './pages/Clients.jsx';
import ClientProfile    from './pages/ClientProfile.jsx';
import Leads            from './pages/Leads.jsx';
import LeadKanban       from './pages/LeadKanban.jsx';
import LeadProfile      from './pages/LeadProfile.jsx';
import Policies         from './pages/Policies.jsx';
import PolicyProfile    from './pages/PolicyProfile.jsx';
import PolicyRegistration from './pages/PolicyRegistration.jsx';
import Renewals         from './pages/Renewals.jsx';
import Tasks            from './pages/Tasks.jsx';
import Documents        from './pages/Documents.jsx';
import EmailManagement  from './pages/EmailManagement.jsx';
import EmailLogs        from './pages/EmailLogs.jsx';
import Insurers         from './pages/Insurers.jsx';
import Products         from './pages/Products.jsx';
import Users            from './pages/Users.jsx';
import Reports          from './pages/Reports.jsx';
import AuditLogs        from './pages/AuditLogs.jsx';
import NotFound         from './pages/NotFound.jsx';

export default function App() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login"           element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/dashboard"     element={<Dashboard />} />
        <Route path="/clients"       element={<Clients />} />
        <Route path="/clients/:id"   element={<ClientProfile />} />
        <Route path="/leads"         element={<Leads />} />
        <Route path="/leads/kanban"  element={<LeadKanban />} />
        <Route path="/leads/:id"     element={<LeadProfile />} />
        <Route path="/policies"      element={<Policies />} />
        <Route path="/policies/:id"  element={<PolicyProfile />} />
        <Route path="/policies/register"         element={<ProtectedRoute roles={['manager']}><PolicyRegistration /></ProtectedRoute>} />
        <Route path="/policies/register/:leadId" element={<ProtectedRoute roles={['manager']}><PolicyRegistration /></ProtectedRoute>} />
        <Route path="/renewals"      element={<Renewals />} />
        <Route path="/tasks"         element={<Tasks />} />
        <Route path="/documents"     element={<Documents />} />
        <Route path="/email/logs"    element={<EmailLogs />} />
        <Route path="/email/management" element={
          <ProtectedRoute roles={['admin']}><EmailManagement /></ProtectedRoute>
        } />
        <Route path="/insurers"  element={<ProtectedRoute roles={['admin']}><Insurers /></ProtectedRoute>} />
        <Route path="/products"  element={<ProtectedRoute roles={['admin']}><Products /></ProtectedRoute>} />
        <Route path="/users"     element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
        <Route path="/reports"   element={<ProtectedRoute roles={['admin','manager']}><Reports /></ProtectedRoute>} />
        <Route path="/audit-logs"element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
