import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { clearToken, getConfig, loadToken, saveToken } from "../shared/storage";

let loginPromise: Promise<string> | null = null;

export const hh = axios.create({
  baseURL: "https://api.hh.ru",
  adapter: "fetch",
  headers: {
    Accept: "application/json",
    "HH-User-Agent": "HH-Plugin/1.0 ([tskanyan@nanosemantics.ai])",
  },
});

async function getAuthCode(): Promise<{ code: string; redirectUri: string }> {
  const cfg = await getConfig();
  const redirectUri = chrome.identity.getRedirectURL("oauth");
  const state = crypto.randomUUID();

  const u = new URL("https://hh.ru/oauth/authorize");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", cfg.HH_CLIENT_ID);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);

  const finalUrl = await chrome.identity.launchWebAuthFlow({
    url: u.toString(),
    interactive: true,
  });
  const url = new URL(finalUrl);
  if (url.searchParams.get("state") !== state)
    throw new Error("State mismatch");
  const code = url.searchParams.get("code");
  if (!code) throw new Error("No code in callback");
  return { code, redirectUri };
}

async function exchangeCodeToAccessToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const cfg = await getConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: cfg.HH_CLIENT_ID,
    client_secret: cfg.HH_CLIENT_SECRET,
    redirect_uri: redirectUri,
  });

  const r = await axios.post("https://api.hh.ru/token", body);

  if (!r.data) {
    throw new Error(`Token exchange failed: ${r.status}`);
  }

  const json = r.data;
  return json.access_token as string;
}

// ==== Достаём токен "по требованию": есть — используем, нет — логиним ====
async function getAccessToken(): Promise<string> {
  const t = await loadToken();
  return t ?? (await login());
}

// ==== Единый вход (локер, чтобы не открывать несколько окон) ====
async function login(): Promise<string> {
  if (!loginPromise) {
    loginPromise = (async () => {
      const { code, redirectUri } = await getAuthCode();
      const token = await exchangeCodeToAccessToken(code, redirectUri);
      await saveToken(token);
      return token;
    })().finally(() => {
      loginPromise = null;
    });
  }
  return loginPromise;
}

// Подставляем токен в каждый запрос
hh.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  // @ts-ignore
  config.headers = {
    ...(config.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };
  return config;
});

// Если получили 401/403 — чистим токен, логинимся заново и повторяем запрос (один раз)
hh.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const resp = error.response;
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (!resp) throw error; // сеть/таймаут — отдать наверх

    if ((resp.status === 401 || resp.status === 403) && !original._retry) {
      original._retry = true;
      await clearToken(); // текущий токен мёртв
      const newToken = await login(); // заново авторизуемся

      // @ts-ignore
      original.headers = {
        ...(original.headers ?? {}),
        Authorization: `Bearer ${newToken}`,
      };
      return hh(original); // повторяем запрос
    }
    throw error;
  },
);
