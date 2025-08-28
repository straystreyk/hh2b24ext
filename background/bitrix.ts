import axios from "axios";
import { getConfig } from "../shared/storage";

export const bitrix = axios.create({
  adapter: "fetch",
  headers: {
    Accept: "application/json",
  },
});

bitrix.interceptors.request.use(async (config) => {
  const cfg = await getConfig();
  const base = cfg?.B24_BASE_URL;

  if (base) config.baseURL = base;
  return config;
});
