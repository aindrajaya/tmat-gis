import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  email: string;
  name: string;
  role?: 'admin';
  provinsi?: string | null;
  perusahaanId?: number | null;
  perusahaanName?: string | null;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

type MockUser = User & { password: string };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mockUsers: MockUser[] = [
  {
    email: 'admin@kemenlh.mail',
    password: 'Admin12345',
    name: 'System Administrator',
    role: 'admin',
    provinsi: null, // no province restriction
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('tmat_auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        // Verify the stored data is valid and not too old (optional: add expiration check)
        if (authData.user && authData.timestamp) {
          setIsAuthenticated(true);
          setUser(authData.user);
        } else {
          localStorage.removeItem('tmat_auth');
        }
      } catch (error) {
        console.warn('Failed to parse stored auth data:', error);
        localStorage.removeItem('tmat_auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Admin-only authentication for current application version.
    const trimmedEmail = email.trim();
    const normalizedEmail = normalizeEmail(trimmedEmail);
    const matchedUser = mockUsers.find(
      (u) => normalizeEmail(u.email) === normalizedEmail && u.password === password
    );

    if (matchedUser) {
      const { password: _pw, ...userData } = matchedUser;
      setIsAuthenticated(true);
      setUser(userData);

      // Store in localStorage
      localStorage.setItem(
        'tmat_auth',
        JSON.stringify({
          user: userData,
          timestamp: new Date().toISOString(),
        })
      );

      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('tmat_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout }}>
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
