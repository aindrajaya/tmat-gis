import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  email: string;
  name: string;
  username?: string;
  role?: 'admin' | 'perusahaan';
  provinsi?: string | null;
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

type MockUser = User & { password: string };

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');


const buildPasswordCandidates = (input: string): string[] => {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const compact = normalizeText(raw);
  const candidates = new Set<string>([raw, lower, compact]);
  return Array.from(candidates).filter(Boolean);
};

const USER_SCOPE_STORAGE_KEY = 'tmat_user_perusahaan_scope_v1';

const loadUserPerusahaanScopeMap = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(USER_SCOPE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, number> = {};
    Object.entries(parsed || {}).forEach(([key, value]) => {
      const id = Number(value);
      if (Number.isInteger(id) && id > 0) normalized[key] = id;
    });
    return normalized;
  } catch {
    return {};
  }
};

const saveUserPerusahaanScopeMap = (map: Record<string, number>): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_SCOPE_STORAGE_KEY, JSON.stringify(map));
};

const getStoredPerusahaanScope = (email?: string | null, username?: string | null): number | null => {
  const scopeMap = loadUserPerusahaanScopeMap();
  const emailKey = normalizeEmail(email || '');
  const usernameKey = normalizeEmail(username || '');
  const byEmail = emailKey ? scopeMap[emailKey] : undefined;
  const byUsername = usernameKey ? scopeMap[usernameKey] : undefined;
  const resolved = byEmail || byUsername;
  return Number.isInteger(resolved) && resolved > 0 ? resolved : null;
};

const storePerusahaanScope = (email: string | undefined, username: string | undefined, perusahaanId: number): void => {
  const id = Number(perusahaanId);
  if (!Number.isInteger(id) || id <= 0) return;

  const scopeMap = loadUserPerusahaanScopeMap();
  const emailKey = normalizeEmail(email || '');
  const usernameKey = normalizeEmail(username || '');
  if (emailKey) scopeMap[emailKey] = id;
  if (usernameKey) scopeMap[usernameKey] = id;
  saveUserPerusahaanScopeMap(scopeMap);
};

const normalizeUserRecord = (raw: any): User => {
  const perusahaanIdRaw = raw?.perusahaanId;
  const perusahaanIdNum = Number(perusahaanIdRaw);
  const normalizedPerusahaanId =
    Number.isInteger(perusahaanIdNum) && perusahaanIdNum > 0
      ? perusahaanIdNum
      : null;

  return {
    ...raw,
    perusahaanId: normalizedPerusahaanId,
  } as User;
};

const mockUsers: MockUser[] = [
  {
    username: 'admin',
    email: 'admin@kemenlh.mail',
    password: 'Admin12345',
    name: 'System Administrator',
    role: 'admin',
    provinsi: null, // no province restriction
  },
  {
    username: 'superadminnsp',
    email: 'nspmeranti@gmail.com',
    password: 'superadminnsp',
    name: 'NSP Meranti',
    role: 'perusahaan',
    perusahaanName: 'NSP Meranti',
  },
  {
    username: 'admmujurlestari',
    email: 'admmujurlestari@gmail.com',
    password: 'admmujurlestari',
    name: 'Mujur Lestari',
    role: 'perusahaan',
    perusahaanName: 'Mujur Lestari',
  },
  {
    username: 'admgrutilestaripratama',
    email: 'admgrutilestaripratama@gmail.com',
    password: 'admgrutilestaripratama',
    name: 'Gruti Lestari Pratama',
    role: 'perusahaan',
    perusahaanName: 'Gruti Lestari Pratama',
  },
  {
    username: 'Sampoerna Agro',
    email: 'superadmsampoernaagro@gmail.com',
    password: 'sampoernaagro',
    name: 'Sampoerna Agro',
    role: 'perusahaan',
    perusahaanName: 'Sampoerna Agro',
  },
  {
    username: 'admfajarpematangindahlestari',
    email: 'admfajarpematangindahlestari@gmail.com',
    password: 'admfajarpematangindahlestari',
    name: 'Fajar Pematang Indah Lestari',
    role: 'perusahaan',
    perusahaanName: 'Fajar Pematang Indah Lestari',
  },
  {
    username: 'admrambangagrojaya',
    email: 'admrambangagrojaya@gmail.com',
    password: 'admrambangagrojaya',
    name: 'Rambang Agro Jaya',
    role: 'perusahaan',
    perusahaanName: 'Rambang Agro Jaya',
  },
];

const findMockUser = (identifier: string, password: string): MockUser | undefined => {
  const normalizedIdentifier = normalizeEmail(identifier);
  const normalizedIdentifierText = normalizeText(identifier);
  const passwordCandidates = new Set(buildPasswordCandidates(password));

  return mockUsers.find((user) => {
    const byEmail = normalizeEmail(user.email) === normalizedIdentifier;
    const byUsername =
      normalizeEmail(user.username || '') === normalizedIdentifier ||
      normalizeText(user.username || '') === normalizedIdentifierText;
    if (!(byEmail || byUsername)) return false;

    // Keep admin strict; allow flexible password formats for company users.
    if (user.role === 'admin') {
      return user.password === password;
    }

    const expected = new Set<string>([
      ...buildPasswordCandidates(user.password),
      ...buildPasswordCandidates(user.username || ''),
      ...buildPasswordCandidates(user.email),
      ...buildPasswordCandidates((user.email.split('@')[0] || '').trim()),
    ]);

    for (const candidate of passwordCandidates) {
      if (expected.has(candidate)) return true;
    }
    return false;
  });
};

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
          const normalizedStoredUser = normalizeUserRecord(authData.user);
          const role = normalizedStoredUser?.role;
          const perusahaanId = Number(normalizedStoredUser?.perusahaanId);
          const validPerusahaanScope =
            role !== 'perusahaan' || (Number.isInteger(perusahaanId) && perusahaanId > 0);
          if (!validPerusahaanScope) {
            console.warn(
              '[Auth] Clearing invalid perusahaan session: perusahaanId is missing/invalid.'
            );
            localStorage.removeItem('tmat_auth');
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
            return;
          }
          setIsAuthenticated(true);
          setUser(normalizedStoredUser);
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
    const trimmedIdentifier = email.trim();
    const matchedUser = findMockUser(trimmedIdentifier, password);

    if (matchedUser) {
      const { password: _pw, ...baseUserData } = matchedUser;
      const manualScope =
        baseUserData.role === 'perusahaan'
          ? getStoredPerusahaanScope(baseUserData.email, baseUserData.username)
          : null;
      const resolvedPerusahaanId =
        baseUserData.role === 'perusahaan'
          ? manualScope || baseUserData.perusahaanId || null
          : baseUserData.perusahaanId ?? null;

      if (baseUserData.role === 'perusahaan') {
        console.log('[Auth] Perusahaan scope resolution:', {
          email: baseUserData.email,
          perusahaanName: baseUserData.perusahaanName,
          resolvedPerusahaanId,
        });
      }

      const userData: User = {
        ...baseUserData,
        perusahaanId: resolvedPerusahaanId ?? null,
      };

      if (baseUserData.role === 'perusahaan' && resolvedPerusahaanId) {
        storePerusahaanScope(baseUserData.email, baseUserData.username, resolvedPerusahaanId);
      }

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

  const updatePerusahaanScope = (perusahaanId: number) => {
    const normalized = Number(perusahaanId);
    if (!Number.isInteger(normalized) || normalized <= 0) return;

    setUser((prev) => {
      if (!prev || prev.role !== 'perusahaan') return prev;
      const nextUser = { ...prev, perusahaanId: normalized };

      const storedAuth = localStorage.getItem('tmat_auth');
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth);
          localStorage.setItem(
            'tmat_auth',
            JSON.stringify({
              ...parsed,
              user: nextUser,
            })
          );
        } catch {
          localStorage.setItem(
            'tmat_auth',
            JSON.stringify({
              user: nextUser,
              timestamp: new Date().toISOString(),
            })
          );
        }
      }

      storePerusahaanScope(nextUser.email, nextUser.username, normalized);
      return nextUser;
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('tmat_auth');
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
