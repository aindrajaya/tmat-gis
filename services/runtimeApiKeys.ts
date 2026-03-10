export interface RuntimeApiKeys {
  adminApiKey: string;
  perusahaanApiKeys: Record<string, string>;
}

const STORAGE_KEY = 'tmat_runtime_api_keys_v1';

const defaultKeys: RuntimeApiKeys = {
  adminApiKey: '',
  perusahaanApiKeys: {},
};

export function loadRuntimeApiKeys(): RuntimeApiKeys {
  if (typeof window === 'undefined') return defaultKeys;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultKeys;
    const parsed = JSON.parse(raw) as Partial<RuntimeApiKeys>;
    return {
      adminApiKey:
        typeof parsed.adminApiKey === 'string' ? parsed.adminApiKey : '',
      perusahaanApiKeys:
        parsed.perusahaanApiKeys && typeof parsed.perusahaanApiKeys === 'object'
          ? (parsed.perusahaanApiKeys as Record<string, string>)
          : {},
    };
  } catch {
    return defaultKeys;
  }
}

export function saveRuntimeApiKeys(keys: RuntimeApiKeys): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function setRuntimeAdminApiKey(apiKey: string): void {
  const current = loadRuntimeApiKeys();
  saveRuntimeApiKeys({
    ...current,
    adminApiKey: apiKey.trim(),
  });
}

export function setRuntimePerusahaanApiKey(
  perusahaanId: number,
  apiKey: string
): void {
  const current = loadRuntimeApiKeys();
  saveRuntimeApiKeys({
    ...current,
    perusahaanApiKeys: {
      ...current.perusahaanApiKeys,
      [String(perusahaanId)]: apiKey.trim(),
    },
  });
}

export function removeRuntimePerusahaanApiKey(perusahaanId: number): void {
  const current = loadRuntimeApiKeys();
  const next = { ...current.perusahaanApiKeys };
  delete next[String(perusahaanId)];
  saveRuntimeApiKeys({
    ...current,
    perusahaanApiKeys: next,
  });
}

export function clearRuntimeApiKeys(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
