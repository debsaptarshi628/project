// Login Page Component
// Firebase Authentication for Patient and Caregiver
// Note: Patient accounts must be created by caregivers through the Caregiver Dashboard

import { useState } from 'react';
import { signIn, register } from '../firebase/auth';
import toast from 'react-hot-toast';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userData;
      if (isRegistering) {
        // Validate password match
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        // Register as caregiver only
        userData = await register(email, password, 'caregiver');
        toast.success('Caregiver account created successfully!');
      } else {
        userData = await signIn(email, password);
        toast.success('Logged in successfully!');
      }
      setUser(userData);
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black px-4">
      <div className="relative max-w-md w-full rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-[0_0_45px_rgba(15,23,42,0.9)] backdrop-blur-lg">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_55%)]" />
        <div className="relative text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-sky-500/70 bg-slate-950 shadow-[0_0_35px_rgba(56,189,248,0.8)] mb-4">
            <svg className="w-8 h-8 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-sky-300 via-sky-400 to-blue-400 bg-clip-text text-transparent">
            SeniorPill
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Smart, connected medication management</p>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-6">
          {isRegistering && (
            <div className="bg-sky-900/40 border border-sky-600/60 rounded-lg p-4 mb-1">
              <p className="text-xs text-sky-100 text-center">
                Registering as <strong>Caregiver</strong>. You will be able to create and manage patient accounts.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wide">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-400 transition-all"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wide">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-400 transition-all"
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-400 transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition-all hover:shadow-[0_0_40px_rgba(56,189,248,0.7)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-0 hover:opacity-100 transition-opacity" />
            <span className="relative">
              {loading
                ? isRegistering
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegistering
                ? 'Register as Caregiver'
                : 'Sign In'}
            </span>
          </button>
        </form>

        <div className="relative mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-xs font-medium text-sky-300 hover:text-sky-200 transition-colors"
          >
            {isRegistering
              ? 'Already have an account? Sign in'
              : "Don’t have an account? Register as Caregiver"}
          </button>
          {!isRegistering && (
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Patient accounts are created by caregivers.
              <br />
              Contact your caregiver if you need a patient account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

