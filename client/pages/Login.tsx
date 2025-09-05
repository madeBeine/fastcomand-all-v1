import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        try {
          const raw = localStorage.getItem('fastcomand_user');
          const u = raw ? JSON.parse(raw) : null;
          const role = u?.role || 'employee';
          const home = role === 'investor' ? '/investment-dashboard' : role === 'delivery' ? '/my-tasks' : '/dashboard';
          navigate(home);
        } catch {
          navigate('/dashboard');
        }
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول');
    }
  };

  const demoUsers = [
    { email: 'admin', label: 'مدير النظام', role: 'admin' },
    { email: 'investor', label: 'مستثمر', role: 'investor' },
    { email: 'employee', label: 'موظف', role: 'employee' },
    { email: 'delivery', label: 'عامل توصيل', role: 'delivery' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo size="4xl" animated />
          </div>
          <h1 className="text-gray-800 dark:text-white text-3xl font-bold mb-3">مرحباً بك في Fast Command</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">نظام ��دارة احترافي وسريع</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                اسم المستخدم أو رقم الهاتف
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent text-right bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm transition-all"
                  placeholder="أدخل اسم المستخدم أو رقم الهاتف"
                  dir="ltr"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent text-right bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm transition-all"
                  placeholder="أدخل كلمة المرور"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50/80 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-right backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white py-4 px-6 rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl',
                isLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:from-brand-blue-dark hover:to-brand-blue'
              )}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        {/* Demo Users */}
        <div className="bg-white/20 dark:bg-gray-800/30 backdrop-blur-xl rounded-3xl border border-white/30 p-6">
          <h3 className="text-gray-800 dark:text-white text-base font-semibold mb-4 text-center">مستخدمون تجريبيون</h3>
          <div className="grid grid-cols-2 gap-2">
            {demoUsers.map((user) => (
              <button
                key={user.email}
                onClick={() => {
                  setEmail(user.email);
                  setPassword('password123');
                }}
                className="bg-white/30 hover:bg-white/50 dark:bg-gray-700/50 dark:hover:bg-gray-600/50 text-gray-800 dark:text-white text-sm py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-md font-medium backdrop-blur-sm"
              >
                {user.label}
              </button>
            ))}
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm text-center mt-4 font-medium">
            كلمة المرور: password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
