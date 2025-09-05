import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'investor' | 'employee' | 'delivery';
export type SystemType = 'admin' | 'investment';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  currentSystem: SystemType;
  setCurrentSystem: (system: SystemType) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentSystem, setCurrentSystem] = useState<SystemType>('admin');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate checking for existing session
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      try {
        // Check localStorage for saved user data
        const savedUser = localStorage.getItem('fastcomand_user');
        const savedSystem = localStorage.getItem('fastcomand_system') as SystemType;
        
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          if (savedSystem) {
            setCurrentSystem(savedSystem);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  async function hashPassword(pw: string) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(pw);
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      let hash = 0;
      for (let i = 0; i < pw.length; i++) hash = (hash << 5) - hash + pw.charCodeAt(i), hash |= 0;
      return 'fallback-' + Math.abs(hash).toString(16);
    } catch (e) {
      let hash = 0;
      for (let i = 0; i < pw.length; i++) hash = (hash << 5) - hash + pw.charCodeAt(i), hash |= 0;
      return 'fallback-' + Math.abs(hash).toString(16);
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const sanitize = (s?: string) => (s || '').toString().replace(/[\u200E\u200F\u202A-\u202E]/g, '');
      const toEnglishDigits = (s?: string) => sanitize(s).replace(/[٠-٩]/g, (d) => '0123456789'[('٠١٢٣٤٥٦٧٨٩').indexOf(d)]).replace(/[۰-۹]/g, (d) => '0123456789'[('۰۱۲۳۴۵۶۷۸۹').indexOf(d)]);
      const normalizeStr = (s?: string) => sanitize(s).trim().toLowerCase();
      const onlyDigits = (s?: string) => toEnglishDigits(sanitize(s)).replace(/\D+/g, '');

      const raw = localStorage.getItem('app_settings_v1');
      let users: any[] = [];
      try {
        users = raw ? (JSON.parse(raw).users || []) : [];
      } catch {}

      const inputEmailOrName = normalizeStr(username);
      const inputPhone = onlyDigits(username);

      const findUser = (arr: any[]) => arr.find(u => {
        const uEmail = normalizeStr(u.email);
        const uName = normalizeStr(u.name);
        const uPhone = onlyDigits(u.phone);
        return (uEmail && uEmail === inputEmailOrName) || (uName && uName === inputEmailOrName) || (uPhone && uPhone.length > 0 && uPhone === inputPhone);
      });

      let found = findUser(users);

      // Fallback: fetch published settings if not found locally
      if (!found) {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            const sUsers = Array.isArray(data?.users) ? data.users : [];
            if (sUsers.length) found = findUser(sUsers);
          }
        } catch {}
      }

      if (found) {
        const hasHash = !!found.passwordHash;
        if (hasHash) {
          const hpw = await hashPassword(password);
          if (hpw !== found.passwordHash) return false;
        } else {
          if (password !== 'password123') return false;
        }

        const logged: User = {
          id: found.id,
          name: found.name,
          email: found.email || found.name,
          role: (found.role as any) || 'employee'
        };
        setUser(logged);
        localStorage.setItem('fastcomand_user', JSON.stringify(logged));
        const sys: SystemType = logged.role === 'investor' ? 'investment' : 'admin';
        handleSystemChange(sys);
        return true;
      }

      const kw = normalizeStr(username);
      const demo: Record<string, User> = {
        admin: { id: '1', name: 'مدير النظام', email: 'admin@fastcomand.com', role: 'admin' },
        investor: { id: '2', name: 'المستثمر الأول', email: 'investor@fastcomand.com', role: 'investor' },
        employee: { id: '3', name: 'موظف المبيعات', email: 'employee@fastcomand.com', role: 'employee' },
        delivery: { id: '4', name: 'عامل التوصيل', email: 'delivery@fastcomand.com', role: 'delivery' }
      };
      const demoUser = demo[kw];
      if (demoUser) {
        if (password !== 'password123') return false;
        setUser(demoUser);
        localStorage.setItem('fastcomand_user', JSON.stringify(demoUser));
        const sys: SystemType = demoUser.role === 'investor' ? 'investment' : 'admin';
        handleSystemChange(sys);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setCurrentSystem('admin');
    localStorage.removeItem('fastcomand_user');
    localStorage.removeItem('fastcomand_system');
  };

  const handleSystemChange = (system: SystemType) => {
    setCurrentSystem(system);
    localStorage.setItem('fastcomand_system', system);
  };

  const value: AuthContextType = {
    user,
    currentSystem,
    setCurrentSystem: handleSystemChange,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
