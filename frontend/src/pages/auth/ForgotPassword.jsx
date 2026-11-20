import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-indigo-700 flex items-center justify-center text-white font-bold text-sm">OR</div>
          <span className="font-semibold text-slate-800">Oracle RMS London North</span>
        </div>

        {sent ? (
          <div className="text-center card card-body">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm mb-4">If that email exists in our system, a password reset link has been sent.</p>
            <Link to="/login" className="btn-primary w-full justify-center">Back to Login</Link>
          </div>
        ) : (
          <div className="card card-body">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Reset your password</h2>
            <p className="text-slate-500 text-sm mb-5">Enter your email and we'll send a reset link.</p>

            {error && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-9" placeholder="you@brokerage.com" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-800">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
