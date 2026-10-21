const API_ROOT = "/api";

export function getToken() {
  return localStorage.getItem("student-management-token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("student-management-token", token);
  } else {
    localStorage.removeItem("student-management-token");
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  } catch {
    throw new Error("Could not reach the API gateway. Check that all backend services are running.");
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = Array.isArray(data?.detail)
      ? data.detail.map((item) => item.msg).join(", ")
      : data?.detail;
    throw new Error(detail || `Request failed (${response.status}).`);
  }
  return data;
}
