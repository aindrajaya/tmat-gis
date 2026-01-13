import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Copy, Check } from 'lucide-react';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language === 'id';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const provinceAccounts = [
    { province: 'Jawa Timur', email: 'jatim@demo.mail', password: 'Jatim12345' },
    { province: 'Jambi', email: 'jambi@demo.mail', password: 'Jambi12345' },
    { province: 'Riau', email: 'riau@demo.mail', password: 'Riau12345' },
    { province: 'Kalimantan Tengah', email: 'kalteng@demo.mail', password: 'Kalteng12345' },
  ];

  const companyAccounts = [
    { company: 'PT. Sawit Jawa Timur 1', email: 'contact1@sawitjt.com', password: 'Perusahaan19' },
    { company: 'PT. Sawit Kalimantan Tengah 1', email: 'contact6@sawitkt.com', password: 'Perusahaan24' },
    { company: 'PT. Sawit Riau 1', email: 'contact16@sawitri.com', password: 'Perusahaan34' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const success = await login(email, password);
    
    if (success) {
      navigate('/');
    } else {
      setError(isIndonesian ? 'Email atau password salah' : 'Invalid email or password');
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/klhk-logo.png" 
                alt="KLHK Logo" 
                className="w-24 h-24 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              {isIndonesian ? 'Selamat Datang Test' : 'Welcome Back Test'}
            </h1>
            <p className="text-slate-700 font-semibold text-sm mb-1">
              {isIndonesian 
                ? 'Kementerian Lingkungan Hidup' 
                : 'Ministry of Environment'}
            </p>
            <p className="text-slate-600 text-sm">
              {isIndonesian 
                ? 'Sistem Monitoring TMAT' 
                : 'TMAT Monitoring System'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 mb-1">
                  {isIndonesian ? 'Login Gagal' : 'Login Failed'}
                </p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                {isIndonesian ? 'Email' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder={isIndonesian ? 'Masukkan email Anda' : 'Enter your email'}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                {isIndonesian ? 'Kata Sandi' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder={isIndonesian ? 'Masukkan kata sandi' : 'Enter your password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isIndonesian ? 'Memproses...' : 'Processing...'}
                </span>
              ) : (
                isIndonesian ? 'Masuk' : 'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials Info */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500 mb-2 font-semibold">
              {isIndonesian ? 'Demo Kredensial:' : 'Demo Credentials:'}
            </p>
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-slate-600">
                    <strong>{isIndonesian ? 'Email:' : 'Email:'}</strong>{' '}
                    <code className="bg-white px-2 py-0.5 rounded text-emerald-700 font-mono text-xs">
                      admin@menlh.mail
                    </code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('admin@menlh.mail', 'email')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded transition-colors"
                  title={isIndonesian ? 'Salin email' : 'Copy email'}
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>{isIndonesian ? 'Tersalin' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{isIndonesian ? 'Salin' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-slate-600">
                    <strong>{isIndonesian ? 'Password:' : 'Password:'}</strong>{' '}
                    <code className="bg-white px-2 py-0.5 rounded text-emerald-700 font-mono text-xs">
                      Admin12345
                    </code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('Admin12345', 'password')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded transition-colors"
                  title={isIndonesian ? 'Salin password' : 'Copy password'}
                >
                  {copiedPassword ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>{isIndonesian ? 'Tersalin' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{isIndonesian ? 'Salin' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Province-scoped demo accounts */}
          <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-2 text-center">
              {isIndonesian ? 'Akun Provinsi (data terkunci per provinsi):' : 'Province Accounts (map data locked per province):'}
            </p>
            <div className="space-y-2">
              {provinceAccounts.map((acc) => (
                <div key={acc.email} className="p-2 rounded-md bg-white border border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{acc.province}</p>
                  <p className="text-[11px] text-slate-600">
                    Email: <code className="bg-slate-100 px-1 rounded">{acc.email}</code>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Password: <code className="bg-slate-100 px-1 rounded">{acc.password}</code>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Company-scoped demo accounts */}
          <div className="mt-4 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-700 mb-2 text-center">
              {isIndonesian
                ? 'Akun Perusahaan (hanya perangkat milik perusahaan terkait):'
                : 'Company Accounts (only their own devices):'}
            </p>
            <div className="space-y-2">
              {companyAccounts.map((acc) => (
                <div key={acc.email} className="p-2 rounded-md bg-white border border-emerald-100">
                  <p className="text-xs font-bold text-slate-800">{acc.company}</p>
                  <p className="text-[11px] text-slate-600">
                    Email: <code className="bg-emerald-50 px-1 rounded">{acc.email}</code>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Password: <code className="bg-emerald-50 px-1 rounded">{acc.password}</code>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          {isIndonesian 
            ? '© 2025 Kementerian Lingkungan Hidup. Semua hak dilindungi.' 
            : '© 2025 Ministry of Environment. All rights reserved.'}
        </p>
      </div>
    </div>
  );
};

export default Login;
