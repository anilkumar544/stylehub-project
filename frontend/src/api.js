const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function getToken() {
  return localStorage.getItem('stylehub_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('stylehub_token', token);
  } else {
    localStorage.removeItem('stylehub_token');
  }
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, { ...options, headers });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((error) => error.msg).filter(Boolean).join(', ')
      : detail;
    throw new Error(message || 'Request failed');
  }
  return data;
}

export const money = (cents) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((cents || 0) / 100);
