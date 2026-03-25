import React, { createContext, useContext, useEffect, useState } from 'react';
import { resetAPIClient, getAuthBaseUrl } from '../services/apiClient';

type User = {
  id: number;
  email: string;
  name: string;
  username?: string;
  role?: 'admin' | 'perusahaan' | 'pemda';
  provinsiId?: string | null;
  kabupatenId?: string | null;
  perusahaanId?: number | null;
  perusahaanName?: string | null;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  updatePerusahaanScope: (perusahaanId: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to verify session using /auth/me
    const verifySession = async () => {
      try {
        const authUrl = `${getAuthBaseUrl()}/me`;
        console.log('[Auth] Verifying session with URL:', authUrl);
        
        const response = await fetch(authUrl, {
          credentials: 'include',
        });
        
        console.log('[Auth] Response status:', response.status);
        console.log('[Auth] Response headers:', {
          'content-type': response.headers.get('content-type'),
          'set-cookie': response.headers.get('set-cookie'),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Auth] Session verified, user:', data.user);
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          const errorText = await response.text();
          console.log('[Auth] Session verification failed. Status:', response.status, 'Body:', errorText);
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Failed to verify session', error);
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${getAuthBaseUrl()}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: email.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        resetAPIClient();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Auth] Login request failed', error);
      return false;
    }
  };

  const updatePerusahaanScope = (perusahaanId: number) => {
    // In Proxy architecture, scope is strictly enforced by the proxy using the token constraints.
    // Setting it in frontend state is purely visual.
    setUser((prev) => {
      if (!prev || prev.role !== 'perusahaan') return prev;
      return { ...prev, perusahaanId: Number(perusahaanId) };
    });
  };

  const logout = async () => {
    try {
      await fetch(`${getAuthBaseUrl()}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[Auth] Logout failed', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      resetAPIClient();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, updatePerusahaanScope, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
