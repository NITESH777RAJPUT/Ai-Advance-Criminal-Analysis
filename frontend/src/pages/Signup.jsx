import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  User,
  BadgeAlert,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
} from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('A valid email address is required.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters in length.');
      return;
    }
    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      setErrorMsg('Password must contain both letters and at least one number.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('You must acknowledge the authorized intelligence access terms.');
      return;
    }

    setLoading(true);

    try {
      await signup({
        full_name: fullName.trim(),
        email: email.trim(),
        badge_number: badgeNumber.trim() || undefined,
        password: password,
      });

      setSuccessMsg('Account registered successfully! Redirecting to intelligence terminal...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMsg(detail);
      } else if (Array.isArray(detail)) {
        setErrorMsg(detail.map((d) => d.msg || d).join(', '));
      } else if (err.message && err.message.includes('Network Error')) {
        setErrorMsg('Network error: Unable to connect to the authentication server. Please check backend connectivity.');
      } else {
        setErrorMsg('Registration failed. Please check your information.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-intel-950 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <main className="w-full max-w-lg bg-intel-900 border border-intel-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
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
              REGISTER
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Investigator Registration</h1>
          <p className="text-xs text-slate-300">
            Create an authenticated field investigator profile
          </p>
        </header>

        {/* Error Alert */}
        {errorMsg && (
          <div
            id="signup-error-msg"
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
              aria-label="Dismiss error notification"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
            <div className="flex-1 font-mono">{successMsg}</div>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {/* Full Name & Badge Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="signup-name" className="text-slate-200 block mb-1 font-medium">
                Full Name <span className="text-cyan-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="signup-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  aria-required="true"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Special Agent Jane Doe"
                  className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-badge" className="text-slate-200 block mb-1 font-medium">
                Badge / Service ID <span className="text-slate-400 font-normal">(optional)</span>:
              </label>
              <div className="relative">
                <BadgeAlert className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="signup-badge"
                  name="badgeNumber"
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="INV-8821"
                  className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="signup-email" className="text-slate-200 block mb-1 font-medium">
              Investigator Email <span className="text-cyan-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investigator@agency.gov"
                className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="signup-password" className="text-slate-200 block mb-1 font-medium">
                Password <span className="text-cyan-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  aria-describedby="password-rules"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-9 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded focus-visible:ring-1 focus-visible:ring-cyan-400"
                  aria-label={showPassword ? 'Hide password text' : 'Show password as plain text'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="text-slate-200 block mb-1 font-medium">
                Confirm Password <span className="text-cyan-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-9 pr-9 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded focus-visible:ring-1 focus-visible:ring-cyan-400"
                  aria-label={showConfirmPassword ? 'Hide confirm password text' : 'Show confirm password as plain text'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          {/* Accessible Password Strength Meter */}
          {password && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300">Password Strength:</span>
                <span
                  className={
                    strength.score === 1
                      ? 'text-red-400 font-semibold'
                      : strength.score === 2
                      ? 'text-amber-400 font-semibold'
                      : 'text-emerald-400 font-semibold'
                  }
                >
                  {strength.label}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={strength.score}
                aria-valuemin="0"
                aria-valuemax="3"
                aria-valuetext={`Password strength is ${strength.label}`}
                className="w-full h-1.5 bg-intel-950 rounded-full overflow-hidden flex"
              >
                <div
                  className={`h-full transition-all duration-300 ${strength.color} ${
                    strength.score === 1 ? 'w-1/3' : strength.score === 2 ? 'w-2/3' : 'w-full'
                  }`}
                />
              </div>
              <p id="password-rules" className="text-[10px] text-slate-400">
                Minimum 8 characters with letters and numbers.
              </p>
            </div>
          )}

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-start space-x-2 pt-1">
            <input
              type="checkbox"
              id="signup-terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-intel-800 bg-intel-950 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-intel-900 cursor-pointer"
            />
            <label htmlFor="signup-terms" className="text-[11px] text-slate-300 cursor-pointer select-none leading-relaxed">
              I agree to the{' '}
              <span className="text-cyan-400 font-medium underline underline-offset-2">
                Operational Security Terms
              </span>{' '}
              and confirm authorized law enforcement or intelligence analysis status.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md shadow-cyan-950 disabled:opacity-50 mt-2 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
          >
            <span>{loading ? 'Registering Investigator...' : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {/* Link back to login */}
        <div className="text-center pt-2 border-t border-intel-800">
          <p className="text-xs text-slate-300">
            Already have an active account?{' '}
            <Link
              to="/login"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 ml-1 focus-visible:ring-1 focus-visible:ring-cyan-400 rounded px-1"
            >
              Login to Terminal
            </Link>
          </p>
        </div>

        {/* Security watermark */}
        <footer className="text-[10px] text-slate-400 font-mono text-center">
          INVESTIGATOR ROLE · RBAC ENFORCED · ZERO-TRUST ARCHITECTURE
        </footer>
      </main>
    </div>
  );
};

export default Signup;
