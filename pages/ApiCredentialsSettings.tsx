import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  clearUserApiKeys,
  removeUserPerusahaanApiKey,
  setUserAdminApiKey,
  setUserPerusahaanApiKey,
} from '../services/apiClient';
import { loadRuntimeApiKeys } from '../services/runtimeApiKeys';

const ApiCredentialsSettings: React.FC = () => {
  const { user, updatePerusahaanScope } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isPerusahaanUser = user?.role === 'perusahaan';
  const scopedPerusahaanIdRaw = user?.perusahaanId;
  const scopedPerusahaanId = (() => {
    const parsed = Number(scopedPerusahaanIdRaw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  })();
  const [adminApiKey, setAdminApiKey] = useState('');
  const [perusahaanId, setPerusahaanId] = useState('');
  const [perusahaanKey, setPerusahaanKey] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  if (!isAdmin && !isPerusahaanUser) {
    return <Navigate to="/" replace />;
  }

  const runtime = useMemo(() => loadRuntimeApiKeys(), [refreshToken]);
  const perusahaanEntries = useMemo(
    () =>
      Object.entries(runtime.perusahaanApiKeys || {})
        .map(([id, key]) => ({ id, key }))
        .sort((a, b) => Number(a.id) - Number(b.id)),
    [runtime]
  );

  useEffect(() => {
    setAdminApiKey(runtime.adminApiKey || '');
  }, [runtime.adminApiKey]);

  useEffect(() => {
    if (isPerusahaanUser && scopedPerusahaanId) {
      setPerusahaanId(String(scopedPerusahaanId));
      setPerusahaanKey(runtime.perusahaanApiKeys[String(scopedPerusahaanId)] || '');
      return;
    }
    if (isPerusahaanUser && !scopedPerusahaanId) {
      setPerusahaanId('');
      setPerusahaanKey('');
    }
  }, [isPerusahaanUser, scopedPerusahaanId, runtime.perusahaanApiKeys]);

  const maskApiKey = (key: string) => {
    if (!key) return '-';
    if (key.length <= 8) return '*'.repeat(key.length);
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const saveAdminKey = () => {
    if (!isAdmin) return;
    setStatus('');
    setError('');
    const value = adminApiKey.trim();
    if (!value) {
      setError('Admin API key wajib diisi.');
      return;
    }
    setUserAdminApiKey(value);
    setStatus('Admin API key berhasil disimpan.');
    setRefreshToken((v) => v + 1);
  };

  const savePerusahaanKey = () => {
    setStatus('');
    setError('');

    const id = Number(perusahaanId);
    const key = perusahaanKey.trim();

    if (!Number.isInteger(id) || id <= 0) {
      setError('ID perusahaan harus angka > 0.');
      return;
    }
    if (!key) {
      setError('API key perusahaan wajib diisi.');
      return;
    }

    if (isPerusahaanUser) {
      updatePerusahaanScope(id);
    }
    setUserPerusahaanApiKey(id, key);
    if (!isPerusahaanUser) {
      setPerusahaanId('');
      setPerusahaanKey('');
    }
    setStatus(`API key perusahaan #${id} berhasil disimpan.`);
    setRefreshToken((v) => v + 1);
  };

  const deletePerusahaanKey = (id: string) => {
    if (!isAdmin) return;
    setStatus('');
    setError('');
    removeUserPerusahaanApiKey(Number(id));
    setStatus(`API key perusahaan #${id} dihapus.`);
    setRefreshToken((v) => v + 1);
  };

  const clearAllKeys = () => {
    if (!isAdmin) return;
    setStatus('');
    setError('');
    clearUserApiKeys();
    setStatus('Semua API key berhasil dihapus.');
    setRefreshToken((v) => v + 1);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">API Credentials</h1>
        <p className="text-sm text-slate-600 mt-1">
          {isAdmin
            ? 'Konfigurasi API key runtime untuk akses endpoint production.'
            : 'Masukkan API key perusahaan Anda. Data aplikasi akan dibatasi ke perusahaan ini.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {isAdmin && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Admin API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={adminApiKey}
                onChange={(e) => setAdminApiKey(e.target.value)}
                placeholder="Masukkan admin API key"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={saveAdminKey}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
              >
                <Save size={16} />
                Simpan
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            API Key Perusahaan
          </label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="number"
              value={perusahaanId}
              onChange={(e) => setPerusahaanId(e.target.value)}
              placeholder="ID Perusahaan"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="password"
              value={perusahaanKey}
              onChange={(e) => setPerusahaanKey(e.target.value)}
              placeholder="Masukkan API key perusahaan"
              className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={savePerusahaanKey}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              <Plus size={16} />
              {isPerusahaanUser ? 'Simpan Key Saya' : 'Add/Update'}
            </button>
          </div>
          {isPerusahaanUser && (
            <p className="text-xs text-slate-500 mt-2">
              Isi ID perusahaan sesuai akun Anda, lalu simpan API key perusahaan.
            </p>
          )}
        </div>

        {isAdmin && perusahaanEntries.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Daftar Key Perusahaan</p>
            {perusahaanEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-slate-700">
                  #{entry.id}: <code className="bg-white px-1 rounded">{maskApiKey(entry.key)}</code>
                </span>
                <button
                  type="button"
                  onClick={() => deletePerusahaanKey(entry.id)}
                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  <Trash2 size={14} />
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            {status && <p className="text-sm text-emerald-700 font-medium">{status}</p>}
            {error && <p className="text-sm text-red-700 font-medium">{error}</p>}
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={clearAllKeys}
              className="text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Reset semua key
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiCredentialsSettings;
