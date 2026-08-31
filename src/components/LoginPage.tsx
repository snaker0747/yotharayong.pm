import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { User, Lock, Eye, EyeOff, Lightbulb, LogIn, AlertCircle, Sun, Moon } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function LoginPage({ onLoginSuccess, theme, onThemeToggle }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load remembered credentials on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('rayong_saved_username');
    const savedPassword = localStorage.getItem('rayong_saved_password');
    const savedRemember = localStorage.getItem('rayong_saved_remember') === 'true';

    if (savedRemember) {
      if (savedUsername) setUsername(savedUsername);
      if (savedPassword) setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Simulate small delays for an elegant professional feel
    setTimeout(() => {
      if (username === 'rayongpm' && password === 'rayong888') {
        if (rememberMe) {
          localStorage.setItem('rayong_saved_username', username);
          localStorage.setItem('rayong_saved_password', password);
          localStorage.setItem('rayong_saved_remember', 'true');
          localStorage.setItem('rayong_custom_logged_in', 'true');
        } else {
          localStorage.removeItem('rayong_saved_username');
          localStorage.removeItem('rayong_saved_password');
          localStorage.removeItem('rayong_saved_remember');
          // For session-only login, we can still set rayong_custom_logged_in in sessionStorage
          sessionStorage.setItem('rayong_custom_logged_in', 'true');
        }
        onLoginSuccess();
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Floating Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onThemeToggle}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors flex items-center justify-center gap-1.5 text-xs font-sans shadow-lg cursor-pointer"
          id="login-theme-toggle"
          type="button"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          <span>{theme === 'light' ? 'โหมดมืด (Dark)' : 'โหมดสว่าง (Light)'}</span>
        </button>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[460px] bg-[#1E293B] border border-slate-700/80 p-5 sm:p-8 rounded-2xl shadow-2xl relative z-10 mx-auto"
        id="login-card-container"
      >
        {/* Logo and Title */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex items-center justify-center bg-white border-2 border-slate-600 shadow-xl mb-3 sm:mb-4 mx-auto shrink-0"
          >
            <img 
              src="/login-logo.png" 
              alt="โลโก้ระบบซ่อมบำรุง" 
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-blue-600 text-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></div>';
                }
              }} 
            />
          </motion.div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight font-sans">
            ระบบงานซ่อมบำรุงไฟฟ้าสาธารณะ
          </h1>
          <p className="text-sm sm:text-base font-bold text-slate-300 mt-1 uppercase tracking-wider font-sans">
            เทศบาลนครระยอง
          </p>
          <span className="text-[11px] sm:text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-0.5 rounded-md mt-2.5 border border-slate-800 font-semibold">
            Rayong City Works v1.0
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6" id="login-form">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-lg flex gap-2.5 items-start font-sans"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm sm:text-base font-semibold text-slate-200 font-sans block">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <User size={20} />
              </span>
              <input
                type="text"
                required
                placeholder="ป้อนชื่อผู้ใช้งาน..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-sans"
                id="login-username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-sm sm:text-base font-semibold text-slate-200 font-sans block">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Lock size={20} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="ป้อนรหัสผ่าน..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-11 pr-11 py-3 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-sans"
                id="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                id="toggle-password-visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer group text-sm sm:text-base text-slate-300 hover:text-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-blue-500 rounded bg-slate-950 border-slate-700 h-4 w-4"
                id="login-remember-me"
              />
              <span className="font-sans font-medium">จดจำบัญชีและรหัสผ่าน (Remember Me)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base sm:text-lg py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            id="login-submit-button"
          >
            {isSubmitting ? (
              <span className="inline-block border-2 border-white/30 border-t-white rounded-full h-5 w-5 animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Help */}
        <div className="mt-8 pt-5 border-t border-slate-800 text-sm text-slate-400 font-sans text-center font-medium">
          <span>จัดทำโดย ฝ่ายสาธารณูปโภค ส่วนการโยธา สำนักช่าง</span>
        </div>
      </motion.div>
    </div>
  );
}
