import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAPIClient } from '../services/apiClient';
import { Perusahaan } from '../types';

type User = {
  email: string;
  name: string;
  role?: 'admin' | 'provinsi' | 'perusahaan';
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

const buildPerusahaanUser = (perusahaan: Perusahaan): User => ({
  email: perusahaan.email_kontak,
  name: perusahaan.pic_kontak,
  role: 'perusahaan',
  perusahaanId: perusahaan.id,
  perusahaanName: perusahaan.nama_perusahaan,
});

const parsePerusahaanPassword = (password: string): number | null => {
  const match = /^perusahaan(\d+)$/i.exec(password.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
};

const mockUsers: MockUser[] = [
  {
    email: 'admin@menlh.mail',
    password: 'Admin12345',
    name: 'System Administrator',
    role: 'admin',
    provinsi: null, // no province restriction
  },
  {
    email: 'jatim@demo.mail',
    password: 'Jatim12345',
    name: 'Operator Jawa Timur',
    role: 'provinsi',
    provinsi: 'Jawa Timur',
  },
  {
    email: 'jambi@demo.mail',
    password: 'Jambi12345',
    name: 'Operator Jambi',
    role: 'provinsi',
    provinsi: 'Jambi',
  },
  {
    email: 'riau@demo.mail',
    password: 'Riau12345',
    name: 'Operator Riau',
    role: 'provinsi',
    provinsi: 'Riau',
  },
  {
    email: 'kalteng@demo.mail',
    password: 'Kalteng12345',
    name: 'Operator Kalimantan Tengah',
    role: 'provinsi',
    provinsi: 'Kalimantan Tengah',
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
    // Mock authentication - matches against predefined users
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

    // Perusahaan-scoped login (based on OpenAPI: /perusahaan)
    const trimmedPassword = password.trim();
    const isPerusahaanPassword = trimmedPassword.toLowerCase().startsWith('perusahaan');
    if (isPerusahaanPassword) {
      const perusahaanId = parsePerusahaanPassword(trimmedPassword);

      try {
        const client = getAPIClient();
        let perusahaan: Perusahaan | null = null;

        // If password embeds an ID (e.g. "Perusahaan19"), prefer direct lookup by ID.
        if (perusahaanId) {
          try {
            const byId = await client.getPerusahaanById(perusahaanId);
            if (normalizeEmail(byId.email_kontak) === normalizedEmail) {
              perusahaan = byId;
            }
          } catch {
            // Fall through to email-based lookup.
          }
        }

        // Fallback: resolve perusahaan by contact email (email_kontak).
        if (!perusahaan) {
          const companies = await client.getPerusahaan();
          perusahaan =
            companies.find((p) => normalizeEmail(p.email_kontak) === normalizedEmail) ||
            null;
        }

        if (!perusahaan) return false;

        const userData = buildPerusahaanUser(perusahaan);
        setIsAuthenticated(true);
        setUser(userData);

        localStorage.setItem(
          'tmat_auth',
          JSON.stringify({
            user: userData,
            timestamp: new Date().toISOString(),
          })
        );

        return true;
      } catch {
        // If API is unreachable but the password includes an ID, allow a minimal perusahaan session.
        // The rest of the app will still be scoped by `perusahaanId`.
        if (!perusahaanId) return false;

        const userData: User = {
          email: trimmedEmail,
          name: 'Perusahaan User',
          role: 'perusahaan',
          perusahaanId,
          perusahaanName: `Perusahaan #${perusahaanId}`,
        };
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem(
          'tmat_auth',
          JSON.stringify({
            user: userData,
            timestamp: new Date().toISOString(),
          })
        );
        return true;
      }
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
