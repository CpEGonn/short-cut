const DEFAULT_API_ROOT = '/api';
const apiRoot = (import.meta.env.VITE_API_URL ?? DEFAULT_API_ROOT).replace(/\/+$/, '');

export function buildApiUrl(path) {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${apiRoot}${suffix}`;
}

export async function requestJson(path, init = {}) {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  return payload.data;
}
