export const getApiUrl = (): string => {
  const url = import.meta.env.VITE_API_URL ?? "";
  // Remove trailing slash if present
  return url.replace(/\/+$/, "");
};

export const API_URL = getApiUrl();
export const SESSION_KEY = "report-builder.session.v1";
export const REFRESH_EARLY_MS = 60_000;
