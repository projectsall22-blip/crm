import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Plus, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import NewLeadDrawer from '../../components/NewLeadDrawer.jsx';

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const map = {
      admin:    { e: 'admin@brokerage.com',    p: 'ChangeMe123!' },
      manager:  { e: 'manager@brokerage.com',  p: 'Manager123!'  },
      producer: { e: 'producer@brokerage.com', p: 'Producer123!' },
    };
    setEmail(map[role].e);
    setPassword(map[role].p);
  };

  return (
    <>
      {/* Full-screen split layout */}
      <div className="min-h-screen flex flex-col lg:flex-row">

        {/* ── LEFT PANEL (desktop only) ── */}
        <div
          className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col justify-between p-10 xl:p-14"
          style={{ background: 'linear-gradient(160deg, #2E2A7E 0%, #1E1B4B 100%)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-xs">
              OR
            </div>
            <span className="text-white font-semibold text-sm">Oracle RMS London North</span>
          </div>

          {/* Centre content */}
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-snug mb-4">
              Oracle RMS<br />
              <span className="text-indigo-300">London North</span>
            </h1>
            <p className="text-indigo-300 text-sm leading-relaxed mb-8 max-w-xs">
              Private brokerage management — clients, leads, policies, commissions,
              renewals, and automated email routing in one secure place.
            </p>

            {/* Key points */}
            <ul className="space-y-3">
              {[
                'Role-based access — Admin, Manager, Producer',
                'Leads pipeline with kanban board',
                'Policy registration & premium calculations',
                'Automated email notifications',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-indigo-200 text-sm">
                  <span className="mt-1 w-4 h-4 rounded-full bg-indigo-500/40 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* Add New Lead button */}
            <div className="mt-10 pt-8 border-t border-white/10">
              <p className="text-indigo-400 text-xs mb-3">New client inquiry? Submit without logging in:</p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20
                           text-white text-sm font-semibold border border-white/20
                           transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Add New Lead
              </button>
            </div>
          </div>

          <p className="text-indigo-600 text-xs">v1.2.0 · Internal use only</p>
        </div>

        {/* ── RIGHT PANEL — Login form ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 bg-gray-50">

          {/* Mobile: logo + Add New Lead */}
          <div className="lg:hidden w-full max-w-sm mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center text-white font-bold text-xs">OR</div>
              <span className="font-semibold text-gray-800 text-sm">Oracle RMS London North</span>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white
                         text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Lead
            </button>
          </div>

          {/* Card */}
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

            {/* Card header */}
            <div className="px-7 pt-7 pb-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-400 text-sm mt-1">Enter your credentials to continue</p>
            </div>

            {/* Form */}
            <div className="px-7 py-6 space-y-4">

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email" required value={email} autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@brokerage.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200
                               bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400
                               focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                               focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                  <Link to="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'} required value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200
                               bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400
                               focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                               focus:bg-white outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit" onClick={handleSubmit} disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm
                           bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                           shadow-md shadow-indigo-500/20
                           transition-all disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : 'Sign In'}
              </button>
            </div>

            {/* Demo credentials */}
            <div className="px-7 pb-7">
              <p className="text-xs text-gray-400 text-center mb-3 flex items-center gap-2">
                <span className="flex-1 h-px bg-gray-100" />
                Demo Access
                <span className="flex-1 h-px bg-gray-100" />
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['admin', 'manager', 'producer'].map((role) => (
                  <button
                    key={role}
                    onClick={() => fillDemo(role)}
                    className="py-2 rounded-xl text-xs font-semibold capitalize
                               bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700
                               border border-gray-200 hover:border-indigo-200
                               transition-all"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-xs text-gray-400 text-center">
            Private system · Authorised users only
          </p>
        </div>
      </div>

      {/* New Lead Drawer */}
      <NewLeadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
