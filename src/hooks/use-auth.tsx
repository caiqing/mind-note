/**
 * Authentication Hook
 *
 * 临时的认证hook，用于开发阶段
 * 在实际生产环境中应该连接真实的认证系统
 */

'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 模拟的用户数据
const mockUser: User = {
  id: 'demo-user',
  email: 'demo@mindnote.com',
  name: 'Demo User',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  role: 'user',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟检查认证状态
    const checkAuth = async () => {
      try {
        // 在实际应用中，这里会调用API检查认证状态
        // 现在直接设置为已认证的demo用户
        await new Promise(resolve => setTimeout(resolve, 500));
        setUser(mockUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 模拟登录API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 简单的模拟验证
      if (email === 'demo@mindnote.com' && password === 'demo') {
        setUser(mockUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    // 在实际应用中，可能还需要清理token等
  };

  const register = async (
    email: string,
    password: string,
    name: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // 模拟注册API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 在实际应用中，这里会调用注册API
      const newUser: User = {
        id: 'new-user-' + Date.now(),
        email,
        name,
        role: 'user',
      };

      setUser(newUser);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
