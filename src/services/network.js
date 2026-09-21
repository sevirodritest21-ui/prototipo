const DEFAULT_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

const originalFetch = window.fetch.bind(window);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resilientFetch(input, init = {}, retries = MAX_RETRIES) {
  const timeoutMs = init.timeout || DEFAULT_TIMEOUT_MS;
  const method = (init.method || 'GET').toUpperCase();
  const isIdempotent = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const cacheKey = typeof input === 'string' ? `net_cache_${input}` : null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const originalSignal = init.signal;
    if (originalSignal) {
      if (originalSignal.aborted) {
        clearTimeout(timeoutId);
        controller.abort();
      } else {
        originalSignal.addEventListener('abort', () => controller.abort());
      }
    }

    try {
      const response = await originalFetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 502 && response.status <= 504 && attempt < retries) {
        await sleep(RETRY_DELAY_MS * Math.pow(1.5, attempt));
        continue;
      }

      if (isIdempotent && response.ok && cacheKey) {
        try {
          const clone = response.clone();
          clone.text().then((text) => {
            sessionStorage.setItem(cacheKey, text);
          }).catch(() => {});
        } catch (_) {}
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);

      const isAbortedByOriginal = originalSignal && originalSignal.aborted;
      if (isAbortedByOriginal) {
        throw err;
      }

      const isNetworkError =
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Load failed') ||
        !navigator.onLine;

      if (attempt < retries && isNetworkError) {
        await sleep(RETRY_DELAY_MS * Math.pow(1.5, attempt));
        continue;
      }

      if (isIdempotent && cacheKey) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          return new Response(cached, {
            status: 200,
            statusText: 'OK (Cache)',
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado. La conexión es muy lenta o inestable.');
      }
      if (!navigator.onLine || isNetworkError) {
        throw new Error('Error de conexión o señal inestable. Por favor intenta nuevamente.');
      }
      throw err;
    }
  }
}

export function initNetworkResilience() {
  if (window.__resilienceInitialized) return;
  window.__resilienceInitialized = true;
  window.fetch = function (input, init) {
    return resilientFetch(input, init);
  };
}
