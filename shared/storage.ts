export const DEFAULTS = {
  HH_CLIENT_ID: import.meta.env.VITE_HH_CLIENT_ID || "",
  HH_CLIENT_SECRET: import.meta.env.VITE_HH_CLIENT_SECRET || "",
  HH_EMPLOYER_ID: import.meta.env.VITE_HH_EMPLOYER_ID || "",

  B24_VACANCIES_ENTITY_TYPE_ID: import.meta.env
    .VITE_B24_VACANCIES_ENTITY_TYPE_ID
    ? Number(import.meta.env.VITE_B24_VACANCIES_ENTITY_TYPE_ID)
    : 0,
  B24_BASE_URL: import.meta.env.VITE_B24_BASE_URL || "",
  B24_RECRUITERS_DEPARTMENT:
    import.meta.env.VITE_B24_RECRUITERS_DEPARTMENT || "",
  B24_RESUME_CATEGORY_ID: import.meta.env.VITE_B24_RESUME_CATEGORY_ID
    ? Number(import.meta.env.VITE_B24_RESUME_CATEGORY_ID)
    : 0,
} as const;

export type Config = {
  [K in keyof typeof DEFAULTS]: string;
};

const STORAGE_KEYS = Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[];

/** Читает конфиг из chrome.storage.local и подставляет дефолты, если чего-то нет */
export async function getConfig(): Promise<Config> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS as string[]);
  return STORAGE_KEYS.reduce((acc, key) => {
    (acc as any)[key] = (stored as any)[key] ?? DEFAULTS[key];
    return acc;
  }, {} as Config);
}

/** Частичное сохранение значений в chrome.storage.local */
export async function setConfig(partial: Partial<Config>) {
  await chrome.storage.local.set(partial);
}

/** Полный сброс к дефолтам */
export async function resetConfig() {
  await chrome.storage.local.set({ ...DEFAULTS });
}

const AUTH_STORAGE_KEY = "hhAuth";

// ==== Хранилище ====
export async function loadToken(): Promise<string | null> {
  const { [AUTH_STORAGE_KEY]: t } =
    await chrome.storage.local.get(AUTH_STORAGE_KEY);
  return (t as string) ?? null;
}
export async function saveToken(token: string) {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: token });
}
export async function clearToken() {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}
