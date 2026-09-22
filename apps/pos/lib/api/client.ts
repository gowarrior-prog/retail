export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customIp = localStorage.getItem('pos_server_ip');
    if (customIp && customIp.trim()) {
      let formatted = customIp.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `http://${formatted}`;
      }
      return formatted;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export function setApiBaseUrl(ip: string): void {
  if (typeof window !== 'undefined') {
    if (!ip || !ip.trim()) {
      localStorage.removeItem('pos_server_ip');
    } else {
      localStorage.setItem('pos_server_ip', ip.trim());
    }
  }
}

export async function discoverLocalServer(): Promise<{ success: boolean; url: string; message: string }> {
  const currentBase = getApiBaseUrl();
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const candidates: string[] = [
    currentBase,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    `http://${host}:8000`,
    'http://pos-server.local:8000',
    'http://192.168.100.2:8000',
    'http://192.168.100.1:8000',
  ];

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    const parts = host.split('.');
    const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
    for (let i = 1; i <= 254; i++) {
      candidates.push(`http://${subnet}.${i}:8000`);
    }
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  const checkUrl = async (url: string): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`${url}/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.server || data.status === 'online') {
          return url;
        }
      }
    } catch {
      // Unreachable
    }
    return null;
  };

  const batchSize = 15;
  for (let i = 0; i < uniqueCandidates.length; i += batchSize) {
    const batch = uniqueCandidates.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(url => checkUrl(url)));
    const winner = results.find(u => u !== null);
    if (winner) {
      setApiBaseUrl(winner);
      return { success: true, url: winner, message: `Auto-connected to shop server at ${winner}` };
    }
  }

  return {
    success: false,
    url: getApiBaseUrl(),
    message: 'Could not discover server on local network.',
  };
}

export async function testServerConnection(targetIp?: string): Promise<{ success: boolean; message: string }> {
  let url = targetIp ? targetIp.trim() : getApiBaseUrl();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { success: true, message: `Connected to shop server at ${url}` };
    }
    return { success: false, message: `Server at ${url} returned status ${res.status}` };
  } catch {
    return { success: false, message: `Could not reach server at ${url}.` };
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiBase = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'string'
        ? err.detail
        : Array.isArray(err.detail)
        ? err.detail.map((e: any) => `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg}`).join(', ')
        : JSON.stringify(err.detail || 'API Error');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}
