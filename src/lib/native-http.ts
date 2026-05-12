// Thin wrapper around CapacitorHttp with a web fallback to fetch().
// Returns a Response-like shape so callers can use res.ok / res.status /
// res.json() / res.text() regardless of platform.
//
// On iOS this bypasses WKWebView CORS and the "DownloadFailed" sandbox
// extension errors that surface for arbitrary cross-origin endpoints.
// All external requests are forced over HTTPS.

import { getCapacitorHttp, isCapacitorNative } from "./capacitor-runtime";

export type NativeHttpInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  // Either a string body (e.g. URL-encoded form), JSON-serializable object,
  // or undefined.
  body?: string | Record<string, unknown> | undefined;
  /** Override the auto-detected response format (CapacitorHttp option). */
  responseType?: "text" | "json" | "blob" | "arraybuffer" | "document";
};

export type NativeHttpResponse = {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

function headersToRecord(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (h instanceof Headers) {
    h.forEach((v, k) => { out[k] = v; });
  } else if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = v;
  } else {
    Object.assign(out, h);
  }
  return out;
}

function enforceHttps(url: string): string {
  if (/^https:\/\//i.test(url)) return url;
  if (/^http:\/\//i.test(url)) return url.replace(/^http:\/\//i, "https://");
  return url;
}

export async function nativeRequest(url: string, init: NativeHttpInit = {}): Promise<NativeHttpResponse> {
  const safeUrl = enforceHttps(url);
  const Http = await getCapacitorHttp();
  if (Http) {
    const method = init.method ?? "GET";
    const headers: Record<string, string> = { ...(init.headers ?? {}) };
    let data: unknown = undefined;
    if (init.body != null) {
      if (typeof init.body === "string") {
        data = init.body;
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
      } else {
        data = init.body;
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log("[native-http] →", method, safeUrl);
    const res = await Http.request({
      url: safeUrl,
      method,
      headers,
      data,
      responseType: init.responseType,
    });
    const status: number = res.status ?? 0;
    const respHeaders: Record<string, string> = res.headers ?? {};
    const raw: unknown = res.data;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: respHeaders,
      text: async () => (typeof raw === "string" ? raw : JSON.stringify(raw ?? "")),
      json: async () => (typeof raw === "string" ? JSON.parse(raw) : raw),
    };
  }
  if (isCapacitorNative()) {
    // eslint-disable-next-line no-console
    console.warn("[native-http] CapacitorHttp unavailable on native — falling back to fetch()", safeUrl);
  }
  const headers = headersToRecord(init.headers);
  let body: BodyInit | undefined;
  if (init.body != null) {
    if (typeof init.body === "string") {
      body = init.body;
    } else {
      body = JSON.stringify(init.body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }
  }
  const res = await fetch(safeUrl, { method: init.method ?? "GET", headers, body });
  const respHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => { respHeaders[k] = v; });
  return {
    ok: res.ok,
    status: res.status,
    headers: respHeaders,
    text: () => res.text(),
    json: () => res.json(),
  };
}

/**
 * Fetches a binary resource (e.g. Mapbox Static image) and returns a data URL
 * that can be assigned to `<img>.src`. On iOS this routes through
 * CapacitorHttp so the request is not killed by WKWebView sandbox extension
 * resets. On web it falls back to fetch + FileReader.
 */
export async function nativeFetchDataUrl(url: string): Promise<string | null> {
  const safeUrl = enforceHttps(url);
  const Http = await getCapacitorHttp();
  if (Http) {
    try {
      // eslint-disable-next-line no-console
      console.log("[native-http] (blob) →", safeUrl);
      const res = await Http.request({ url: safeUrl, method: "GET", responseType: "blob" });
      const status: number = res.status ?? 0;
      if (status < 200 || status >= 300) return null;
      const data: unknown = res.data;
      // CapacitorHttp returns base64 string for blob responseType on iOS.
      if (typeof data === "string") {
        const headers: Record<string, string> = res.headers ?? {};
        const ct = headers["Content-Type"] ?? headers["content-type"] ?? "image/png";
        const cleaned = data.startsWith("data:") ? data : `data:${ct};base64,${data}`;
        return cleaned;
      }
      return null;
    } catch {
      return null;
    }
  }
  try {
    const res = await fetch(safeUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
