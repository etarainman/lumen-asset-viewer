import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Database, Building2, Loader2 } from 'lucide-react';

export type Customer = 'DEMO' | 'LUMEN';

const LOGO_URL = "https://ik.imagekit.io/gae3bdoli/ambiflo_full_white_clearance-256.png";

// Authenticate against the same backend as the main Ambiflo application, so
// users sign in with their real Ambiflo email + password. Override the base
// URL at build time with VITE_API_BASE_URL if the backend ever moves.
const AUTH_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'https://acc-backend.fly.dev';

interface LoginScreenProps {
  // Called once credentials are valid and a customer has been chosen.
  onEnter: (customer: Customer) => void;
  // Last customer used, to pre-select on load.
  initialCustomer?: Customer;
}

const CUSTOMER_OPTIONS: Array<{
  value: Customer;
  title: string;
  sub: string;
  icon: React.ReactNode;
}> = [
  { value: 'DEMO', title: 'Demo Sites', sub: '787 sample sites', icon: <Database size={18} /> },
  { value: 'LUMEN', title: 'Live Sites', sub: '3 real sites', icon: <Building2 size={18} /> },
];

const LoginScreen: React.FC<LoginScreenProps> = ({ onEnter, initialCustomer = 'DEMO' }) => {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${AUTH_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Invalid email or password');
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      // Mirror the main app's session storage for parity.
      try {
        if (data.token) localStorage.setItem('dds_token', data.token);
        if (data.user) localStorage.setItem('dds_user', JSON.stringify(data.user));
      } catch { /* ignore storage failures */ }
      onEnter(customer);
    } catch {
      setError('Could not reach the server — check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-slate-950 font-sans p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        {/* Logo sits on the dark page so the white mark stays visible */}
        <div className="flex justify-center mb-6">
          <img src={LOGO_URL} alt="Ambiflo" className="h-9 object-contain" />
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Force autofilled inputs to keep a clean white fill + dark text */}
          <style>{`input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px #ffffff inset;-webkit-text-fill-color:#0f172a;caret-color:#0f172a;}`}</style>

          <h1 className="text-xl font-black tracking-tight text-slate-900 text-center mb-6">Data Centre Viewer</h1>

          {/* Customer choice */}
          <label className="block text-[10px] font-black tracking-tight text-slate-500 mb-2">Dataset</label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {CUSTOMER_OPTIONS.map((opt) => {
              const active = customer === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCustomer(opt.value)}
                  aria-pressed={active}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all ${
                    active
                      ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/40'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={active ? 'text-blue-600' : 'text-slate-400'}>{opt.icon}</span>
                  <span className="text-[12px] font-black tracking-tight text-slate-900 leading-none">{opt.title}</span>
                  <span className="text-[10px] font-bold text-slate-500 leading-none">{opt.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Email */}
          <label className="block text-[10px] font-black tracking-tight text-slate-500 mb-2">Email</label>
          <div style={{ backgroundColor: '#ffffff' }} className="flex items-center gap-2 px-3 rounded-2xl border border-slate-300 focus-within:border-blue-500 transition-colors mb-4">
            <Mail size={14} className="text-slate-400 shrink-0" />
            <input
              type="email"
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
              placeholder="you@company.com"
              className="flex-1 bg-transparent py-3 text-[12px] font-bold text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* Password */}
          <label className="block text-[10px] font-black tracking-tight text-slate-500 mb-2">Password</label>
          <div style={{ backgroundColor: error ? '#fef2f2' : '#ffffff' }} className={`flex items-center gap-2 px-3 rounded-2xl border transition-colors ${error ? 'border-red-400' : 'border-slate-300 focus-within:border-blue-500'}`}>
            <Lock size={14} className="text-slate-400 shrink-0" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
              placeholder="Enter your password"
              className="flex-1 bg-transparent py-3 text-[12px] font-bold text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>
          {error && (
            <p className="text-[10px] font-bold text-red-600 mt-2">{error}</p>
          )}

          <button
            type="submit"
            className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-2"
            disabled={submitting || email.length === 0 || password.length === 0}
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Signing in…</>
            ) : (
              <>Enter <ArrowRight size={14} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
