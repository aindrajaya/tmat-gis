import React, { createContext, useContext, useState, useEffect } from 'react';

type User = { email: string; name: string; provinsi?: string | null };

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const mockUsers: Array<User & { password: string }> = [
  {
    email: 'admin@menlhkproject.mail',
    password: 'Admin12345',
    name: 'System Administrator',
    provinsi: null, // no province restriction
  },
  {
    email: 'jatim@demo.mail',
    password: 'Jatim12345',
    name: 'Operator Jawa Timur',
    provinsi: 'Jawa Timur',
  },
  {
    email: 'jambi@demo.mail',
    password: 'Jambi12345',
    name: 'Operator Jambi',
    provinsi: 'Jambi',
  },
  {
    email: 'riau@demo.mail',
    password: 'Riau12345',
    name: 'Operator Riau',
    provinsi: 'Riau',
  },
  {
    email: 'kalteng@demo.mail',
    password: 'Kalteng12345',
    name: 'Operator Kalimantan Tengah',
    provinsi: 'Kalimantan Tengah',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('tmat_auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setIsAuthenticated(true);
        setUser(authData.user);
      } catch {
        localStorage.removeItem('tmat_auth');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - matches against predefined users
    const matchedUser = mockUsers.find(
      (u) => u.email === email.trim() && u.password === password
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
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
