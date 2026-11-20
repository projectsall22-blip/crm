import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import NewLeadDrawer from '../../components/NewLeadDrawer.jsx';

/* ── Floating icon bubble (decorative) ── */
function Bubble({ icon, style, animate }) {
  return (
    <div
      className={`absolute flex items-center justify-center rounded-full shadow-xl
                  bg-white/15 backdrop-blur-sm border border-white/30
                  text-white text-xl ${animate}`}
      style={style}
    >
      {icon}
    </div>
  );
}

/* ── SVG Illustration: abstract CRM figure ── */
function HeroIllustration() {
  return (
    <div className="relative w-full flex items-center justify-center select-none">
      {/* Central glow circle */}
      <div className="relative w-56 h-56 md:w-64 md:h-64">
        <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute inset-4 rounded-full bg-indigo-400/20 border border-white/20" />
        <div className="absolute inset-10 rounded-full bg-indigo-300/20 border border-white/30" />

        {/* Centre avatar */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-300 to-purple-500
                          flex items-center justify-center shadow-2xl border-4 border-white/30">
            <svg viewBox="0 0 48 48" className="w-10 h-10 fill-white">
              <circle cx="24" cy="16" r="8" />
              <path d="M8 40c0-8.837 7.163-16 16-16s16 7.163 16 16" />
            </svg>
          </div>
        </div>
      </div>

      {/* Floating bubbles */}
      <Bubble icon="📧" style={{ top: '0%',   left: '10%',  width: 52, height: 52 }}
              animate="animate-bounce [animation-delay:0s]" />
      <Bubble icon="📊" style={{ top: '5%',   right: '8%',  width: 60, height: 60 }}
              animate="animate-bounce [animation-delay:.4s]" />
      <Bubble icon="🔗" style={{ top: '40%',  left: '0%',   width: 48, height: 48 }}
              animate="animate-bounce [animation-delay:.8s]" />
      <Bubble icon="📋" style={{ top: '40%',  right: '2%',  width: 56, height: 56 }}
              animate="animate-bounce [animation-delay:.2s]" />
      <Bubble icon="💰" style={{ bottom: '5%',left: '12%',  width: 56, height: 56 }}
              animate="animate-bounce [animation-delay:.6s]" />
      <Bubble icon="📈" style={{ bottom: '0%',right: '10%', width: 52, height: 52 }}
              animate="animate-bounce [animation-delay:1s]" />

      {/* Connector lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
           viewBox="0 0 300 300">
        <line x1="150" y1="150" x2="45"  y2="30"  stroke="white" strokeWidth="1.5" strokeDasharray="4 4"/>
        <line x1="150" y1="150" x2="255" y2="40"  stroke="white" strokeWidth="1.5" strokeDasharray="4 4"/>
        <line x1="150" y1="150" x2="20"  y2="150" stroke="white" strokeWidth="1.5" strokeDasharray="4 4"/>
        <line x1="150" y1="150" x2="280" y2="150" stroke="white" strokeWidth="1.5" strokeDasharray="4 4"/>
        <line x1="150" y1="150" x2="50"  y2="265" stroke="white" strokeWidth="1.5" strokeDasharray="4 4"/>
        <line x1="150" y1="150" x2="255" y2="265" stroke="white" strokeWidth="1.5" strokeDasharray="4 4"/>
      </svg>
    </div>
  );
}

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
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
      {/* ── Page wrapper ── */}
      <div
        className="min-h-screen flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #fce7f3 100%)' }}
      >

        {/* ── Main card ── */}
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex
                        flex-col lg:flex-row min-h-[560px]">

          {/* ════════════════════════════════════════
              LEFT — Purple illustration panel
          ════════════════════════════════════════ */}
          <div
            className="relative flex flex-col justify-between p-8 xl:p-10
                       lg:w-[52%] overflow-hidden
                       /* mobile: show a slim banner, desktop: full panel */
                       hidden lg:flex"
            style={{
              background: 'linear-gradient(145deg, #4338ca 0%, #3b1fa8 40%, #1e1b6e 100%)',
            }}
          >
            {/* Decorative background blobs */}
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full
                            bg-purple-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full
                            bg-indigo-800/40 blur-3xl pointer-events-none" />
            {/* Tropical leaf hints */}
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none select-none text-[160px] leading-none">
              🌿
            </div>
            <div className="absolute bottom-0 left-0 opacity-10 pointer-events-none select-none text-[140px] leading-none rotate-180">
              🌿
            </div>

            {/* Logo */}
            <div className="relative flex items-center gap-3 z-10">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm
                              flex items-center justify-center font-bold text-white text-xs
                              border border-white/30">
                OR
              </div>
              <span className="text-white font-semibold text-sm tracking-wide">
                Oracle RMS London North
              </span>
            </div>

            {/* Illustration */}
            <div className="relative z-10 py-4">
              <HeroIllustration />
            </div>

            {/* Footer tag */}
            <p className="relative z-10 text-indigo-400 text-xs">v1.2.0 · Internal use only</p>
          </div>

          {/* ════════════════════════════════════════
              RIGHT — Login form
          ════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-10 bg-white">

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center
                                text-white font-bold text-xs">
                  OR
                </div>
                <span className="font-semibold text-gray-800 text-sm">Oracle RMS</span>
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600
                           text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Lead
              </button>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Sign In to your Account
              </h2>
              <p className="text-gray-400 text-sm mt-1.5">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50
                                border border-red-100 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email" required value={email} autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200
                               bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400
                               focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                               focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'} required value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200
                               bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400
                               focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                               focus:bg-white outline-none transition-all"
                  />
                  <button
                    type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400
                               hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox" id="remember" checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              {/* Sign In button */}
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide
                           bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                           shadow-lg shadow-indigo-500/30
                           transition-all disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                     rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : 'SIGN IN'}
              </button>
            </form>

            {/* Divider + Demo buttons */}
            <div className="mt-6">
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
                               border border-gray-200 hover:border-indigo-200 transition-all"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop: Add New Lead link */}
            <p className="hidden lg:block mt-5 text-xs text-gray-400 text-center">
              New client inquiry?{' '}
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                Submit without logging in
              </button>
            </p>

            <p className="mt-4 text-xs text-gray-300 text-center">
              Private system · Authorised users only
            </p>
          </div>
        </div>
      </div>

      {/* New Lead Drawer */}
      <NewLeadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
