// Thin wrapper around CapacitorHttp with a web fallback to fetch().
// Returns a Response-like shape so callers can use res.ok / res.status /
// res.json() / res.text() regardless of platform.
//
// On iOS this bypasses WKWebView CORS and the "DownloadFailed" sandbox
// extension errors that surface for arbitrary cross-origin endpoints.

import { getCapacitorHttp } from "./capacitor-runtime";

export type NativeHttpInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  // Either a string body (e.g. URL-encoded form), JSON-serializable object,
  // or undefined.
  body?: string | Record<string, unknown> | undefined;
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

export async function nativeRequest(url: string, init: NativeHttpInit = {}): Promise<NativeHttpResponse> {
  const Http = await getCapacitorHttp();
  if (Http) {
    const method = init.method ?? "GET";
    const headers = init.headers ?? {};
    let data: unknown = undefined;
    if (init.body != null) {
      if (typeof init.body === "string") {
        data = init.body;
      } else {
        data = init.body;
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
      }
    }
    const res = await Http.request({ url, method, headers, data });
    const status: number = res.status ?? 0;
    const respHeaders: Record<string, string> = res.headers ?? {};
    // CapacitorHttp returns parsed body when JSON, else string.
    const raw: unknown = res.data;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: respHeaders,
      text: async () => (typeof raw === "string" ? raw : JSON.stringify(raw ?? "")),
      json: async () => (typeof raw === "string" ? JSON.parse(raw) : raw),
    };
  }
  // Web fallback
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
  const res = await fetch(url, { method: init.method ?? "GET", headers, body });
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
