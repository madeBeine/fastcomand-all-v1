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

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock user data based on username
      let mockUser: User;

      if (username === 'admin' || username.includes('admin')) {
        mockUser = {
          id: '1',
          name: 'مدير النظام',
          email: 'admin@fastcomand.com',
          role: 'admin'
        };
      } else if (username === 'investor' || username.includes('investor')) {
        mockUser = {
          id: '2',
          name: 'المستثمر الأول',
          email: 'investor@fastcomand.com',
          role: 'investor'
        };
        setCurrentSystem('investment');
      } else if (username === 'employee' || username.includes('employee')) {
        mockUser = {
          id: '3',
          name: 'موظف المبيعات',
          email: 'employee@fastcomand.com',
          role: 'employee'
        };
      } else if (username === 'delivery' || username.includes('delivery')) {
        mockUser = {
          id: '4',
          name: 'عامل التوصيل',
          email: 'delivery@fastcomand.com',
          role: 'delivery'
        };
      } else {
        mockUser = {
          id: '1',
          name: 'مدير النظام',
          email: 'admin@fastcomand.com',
          role: 'admin'
        };
      }

      setUser(mockUser);
      localStorage.setItem('fastcomand_user', JSON.stringify(mockUser));
      
      return true;
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
