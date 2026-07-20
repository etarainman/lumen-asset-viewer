import React, { useState } from 'react';
import { Lock, ArrowRight, Database, Building2 } from 'lucide-react';

export type Customer = 'DEMO' | 'LUMEN';

const LOGO_URL = "https://ik.imagekit.io/gae3bdoli/ambiflo_full_white_clearance-256.png";

// Soft shared-access gate. This is a client-side convenience lock (not real
// security — the check runs in the browser), matching the existing field-client
// password pattern. Override without a code change via VITE_APP_PASSWORD.
const ACCESS_PASSWORD = ((import.meta as any).env?.VITE_APP_PASSWORD as string) || 'cloud';

interface LoginScreenProps {
  // Called once the password is correct and a customer has been chosen.
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
  { value: 'LUMEN', title: 'Lumen — Live', sub: '3 real sites', icon: <Building2 size={18} /> },
];

const LoginScreen: React.FC<LoginScreenProps> = ({ onEnter, initialCustomer = 'DEMO' }) => {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      setError(false);
      onEnter(customer);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-slate-950 text-slate-200 font-sans p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900/60 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <img src={LOGO_URL} alt="Ambiflo" className="h-9 object-contain mb-6" />
          <h1 className="text-xl font-black tracking-tight text-white">Data Centre Viewer</h1>
          <p className="text-[11px] font-bold text-slate-500 mt-1">Sign in to continue</p>
        </div>

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
                    ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/50'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                }`}
              >
                <span className={active ? 'text-blue-400' : 'text-slate-400'}>{opt.icon}</span>
                <span className="text-[12px] font-black tracking-tight text-white leading-none">{opt.title}</span>
                <span className="text-[10px] font-bold text-slate-500 leading-none">{opt.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Password */}
        <label className="block text-[10px] font-black tracking-tight text-slate-500 mb-2">Password</label>
        <div className={`flex items-center gap-2 px-3 rounded-2xl border transition-colors ${error ? 'border-red-500/70 bg-red-500/5' : 'border-white/10 bg-white/[0.03] focus-within:border-blue-500'}`}>
          <Lock size={14} className="text-slate-500 shrink-0" />
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(false); }}
            placeholder="Enter access password"
            className="flex-1 bg-transparent py-3 text-[12px] font-bold text-white placeholder:text-slate-600 outline-none"
          />
        </div>
        {error && (
          <p className="text-[10px] font-bold text-red-400 mt-2">Incorrect password — try again.</p>
        )}

        <button
          type="submit"
          className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-[11px] font-black tracking-tight transition-all flex items-center justify-center gap-2"
          disabled={password.length === 0}
        >
          Enter <ArrowRight size={14} />
        </button>
      </form>
    </div>
  );
};

export default LoginScreen;
