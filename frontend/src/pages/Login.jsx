import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Radio,
  Eye,
  EyeOff,
  HelpCircle,
  X,
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showForgotModal) {
        setShowForgotModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMsg(detail);
      } else if (Array.isArray(detail)) {
        setErrorMsg(detail.map((d) => d.msg || d).join(', '));
      } else if (err.message && err.message.includes('Network Error')) {
        setErrorMsg('Network error: Unable to connect to the authentication server. Please verify backend connectivity.');
      } else {
        setErrorMsg('Authentication failed. Please verify your credentials or network status.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await demoLogin(role);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Demo login failed. Ensure the server is online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-intel-950 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <main className="w-full max-w-md bg-intel-900 border border-intel-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <header className="text-center space-y-2">
          <div
            className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-lg shadow-cyan-950"
            aria-hidden="true"
          >
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="font-mono text-sm tracking-widest uppercase font-bold text-slate-100">
              CRIMENET
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              SECURE
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Intelligence Terminal Access</h1>
          <p className="text-xs text-slate-300">
            Law Enforcement AI Criminal Network Analysis Platform
          </p>
        </header>

        {errorMsg && (
          <div
            id="login-error-msg"
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
            <div className="flex-1 font-mono font-medium">{errorMsg}</div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-200 ml-1 p-0.5 rounded focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label="Dismiss error alert"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div>
            <label htmlFor="login-email" className="text-slate-200 block mb-1 font-medium">
              Investigator Email <span className="text-cyan-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={!!errorMsg}
                aria-describedby={errorMsg ? "login-error-msg" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investigator@intelligence.gov"
                className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="text-slate-200 font-medium">
                Access Password <span className="text-cyan-400" aria-hidden="true">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono focus-visible:ring-1 focus-visible:ring-cyan-400 rounded px-1"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-required="true"
                aria-invalid={!!errorMsg}
                aria-describedby={errorMsg ? "login-error-msg" : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded focus-visible:ring-1 focus-visible:ring-cyan-400"
                aria-label={showPassword ? 'Hide password text' : 'Show password as plain text'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md shadow-cyan-950 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {/* Link to Signup */}
        <div className="text-center pt-1 pb-1">
          <p className="text-xs text-slate-300">
            Don't have an investigator account?{' '}
            <Link
              to="/signup"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 ml-1 focus-visible:ring-1 focus-visible:ring-cyan-400 rounded px-1"
            >
              Sign Up
            </Link>
          </p>
        </div>

        {/* Quick Demo Logins */}
        <section aria-labelledby="demo-profiles-heading" className="pt-4 border-t border-intel-800 space-y-2.5">
          <span
            id="demo-profiles-heading"
            className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block text-center font-semibold"
          >
            PRESET ACCESS PROFILES
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('admin')}
              className="py-2 px-3 rounded-lg bg-intel-950 hover:bg-intel-850 border border-intel-800 text-slate-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400"
              aria-label="Log in with preconfigured Administrator demo credentials"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
              <span>Admin Demo</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('investigator')}
              className="py-2 px-3 rounded-lg bg-intel-950 hover:bg-intel-850 border border-intel-800 text-slate-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Log in with preconfigured Investigator demo credentials"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>Investigator Demo</span>
            </button>
          </div>
        </section>

        {/* Footer info */}
        <footer className="text-[10px] text-slate-400 font-mono text-center pt-2">
          AUTHORIZED PERSONNEL ONLY · 256-BIT ENCRYPTION
        </footer>
      </main>

      {/* Forgot Password Security Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-sm bg-intel-900 border border-intel-750 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-cyan-400">
                <HelpCircle className="w-5 h-5" aria-hidden="true" />
                <h2 id="forgot-modal-title" className="font-bold text-sm text-slate-100">
                  Password Recovery Notice
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded focus-visible:ring-2 focus-visible:ring-cyan-400"
                aria-label="Close recovery dialog"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Under CRIMENET operational security protocols, password resets cannot be performed via unauthenticated public channels.
            </p>
            <div className="p-3 bg-intel-950 border border-intel-800 rounded-lg text-[11px] text-slate-300 font-mono space-y-1">
              <div>• Contact your system Administrator / Director.</div>
              <div>• Request a password rotation from the Admin Console.</div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-intel-800 hover:bg-intel-750 text-slate-200 text-xs font-semibold rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
