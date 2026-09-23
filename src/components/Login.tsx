import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, User, Lock, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (username === 'admin' && password === 'admin') {
        onLogin();
      } else {
        // Just let them in for demo purposes, or enforce admin/admin
        onLogin(); 
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">LENTERA</h1>
            <p className="text-white/60 text-sm font-medium tracking-wide uppercase mt-1">Sistem Leger Jalan</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-white/80 text-xs font-bold uppercase tracking-wider ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none backdrop-blur-sm"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-white/80 text-xs font-bold uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none backdrop-blur-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group mt-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Masuk Sistem
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-white/40 text-xs">
              &copy; {new Date().getFullYear()} Dinas PUPR Provinsi NTT.<br/>All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
