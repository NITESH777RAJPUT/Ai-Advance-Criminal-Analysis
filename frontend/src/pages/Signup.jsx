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
  FileText,
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
      setErrorMsg('You must acknowledge the authorized intelligence access & terms.');
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
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-intel-900 border border-intel-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
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
              REGISTER
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Investigator Registration</h1>
          <p className="text-xs text-slate-400">
            Create an authenticated field investigator profile
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-mono">{errorMsg}</div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-300 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 font-mono">{successMsg}</div>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name & Badge Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Full Name:</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Special Agent Jane Doe"
                  className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">
                Badge / Service ID <span className="text-slate-500 font-normal">(optional)</span>:
              </label>
              <div className="relative">
                <BadgeAlert className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="INV-8821"
                  className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="text-slate-300 block mb-1 font-medium">Investigator Email:</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investigator@agency.gov"
                className="w-full pl-9 pr-3 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Password:</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-9 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium">Confirm Password:</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-9 pr-9 py-2.5 bg-intel-950 border border-intel-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Strength Meter */}
          {password && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Password Strength:</span>
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
              <div className="w-full h-1.5 bg-intel-950 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${strength.color} ${
                    strength.score === 1 ? 'w-1/3' : strength.score === 2 ? 'w-2/3' : 'w-full'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Minimum 8 characters with letters and numbers.
              </p>
            </div>
          )}

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-start space-x-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-intel-800 bg-intel-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-intel-900 cursor-pointer"
            />
            <label htmlFor="terms" className="text-[11px] text-slate-300 cursor-pointer select-none leading-relaxed">
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
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md shadow-cyan-950 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Registering Investigator...' : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link back to login */}
        <div className="text-center pt-2 border-t border-intel-800">
          <p className="text-xs text-slate-400">
            Already have an active account?{' '}
            <Link
              to="/login"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 ml-1"
            >
              Login to Terminal
            </Link>
          </p>
        </div>

        {/* Security watermark */}
        <div className="text-[10px] text-slate-500 font-mono text-center">
          INVESTIGATOR ROLE · RBAC ENFORCED · ZERO-TRUST ARCHITECTURE
        </div>
      </div>
    </div>
  );
};

export default Signup;
