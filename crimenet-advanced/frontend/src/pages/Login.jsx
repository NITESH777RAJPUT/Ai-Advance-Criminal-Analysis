import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Radio } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Authentication failed. Verify credentials.');
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
      setErrorMsg(err.response?.data?.detail || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-intel-950 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-intel-900 border border-intel-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-lg shadow-cyan-950">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="font-mono text-sm tracking-widest uppercase font-bold text-slate-100">
              CRIMENET
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              SECURE
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Intelligence Terminal Access</h1>
          <p className="text-xs text-slate-400">
            Law Enforcement AI Criminal Network Analysis Platform
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1 font-medium">Investigator Email:</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investigator@intelligence.gov"
                className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-medium">Access Password:</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md shadow-cyan-950 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="pt-4 border-t border-intel-800 space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block text-center">
            PRESET ACCESS PROFILES
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('admin')}
              className="py-2 px-3 rounded-lg bg-intel-950 hover:bg-intel-850 border border-intel-800 text-slate-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Demo</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('investigator')}
              className="py-2 px-3 rounded-lg bg-intel-950 hover:bg-intel-850 border border-intel-800 text-slate-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Investigator Demo</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-slate-500 font-mono text-center pt-2">
          AUTHORIZED PERSONNEL ONLY · 256-BIT ENCRYPTION
        </div>
      </div>
    </div>
  );
};

export default Login;

