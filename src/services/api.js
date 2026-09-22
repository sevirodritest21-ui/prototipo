export const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
export const API_URL = BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  let data = null;
  let isJson = false;

  try {
    const contentType = response.headers.get('content-type') || '';
    isJson = contentType.includes('application/json');
    data = isJson ? await response.json() : await response.text();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 503 || response.status === 502) {
      throw new Error('El servicio está temporalmente no disponible. Reintentando conexión...');
    }
    if (response.status === 504) {
      throw new Error('Tiempo de respuesta agotado por el servidor.');
    }
    const message = (isJson && data?.detail) ? data.detail : `Error del servidor (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function apiPost(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPut(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse(response);
}