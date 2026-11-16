export function validateConfig(config) {
  if (!config || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url || ""))
    return false;
  const key = config.publishableKey || "";
  if (key.startsWith("sb_publishable_")) return true;
  try {
    return (
      JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
        .role === "anon"
    );
  } catch {
    return false;
  }
}
export class Api {
  constructor(config, fetcher = fetch) {
    this.config = config;
    this.fetcher = fetcher;
    this.token = null;
  }
  clear() {
    this.token = null;
  }
  async request(path, { method = "GET", body, prefer } = {}) {
    const headers = {
      apikey: this.config.publishableKey,
      "Content-Type": "application/json",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (prefer) headers.Prefer = prefer;
    const response = await this.fetcher(this.config.url + path, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      credentials: "omit",
    });
    if (response.status === 401) {
      this.clear();
      throw new Error("Your session has ended. Sign in again.");
    }
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      const messages = {
        23505: "This reference already exists. Use a unique reference.",
        40001:
          "Another staff member changed this enquiry. Refresh before saving.",
        42501: "Your account does not have permission for this action.",
        22023: "Check the enquiry details and privacy acknowledgement.",
        23514: "Check required fields, amounts and allowed values.",
        23502: "Complete all required fields.",
      };
      throw new Error(
        messages[failure.code] ||
          "The request could not be completed. Check your details or try again.",
      );
    }
    return response.status === 204 ? null : response.json();
  }
  async login(email, password) {
    const result = await this.request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email, password },
    });
    this.token = result.access_token;
    try {
      const role = await this.rpc("sf_access_role", {});
      if (!["viewer", "editor", "admin"].includes(role))
        throw new Error("This account has not been granted staff access.");
      return role;
    } catch (error) {
      this.clear();
      throw error;
    }
  }
  rpc(name, body) {
    return this.request(`/rest/v1/rpc/${name}`, { method: "POST", body });
  }
  insert(table, body) {
    return this.request(`/rest/v1/${table}`, {
      method: "POST",
      body,
      prefer: "return=representation",
    });
  }
  async update(table, id, body) {
    const rows = await this.request(
      `/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
      { method: "PATCH", body, prefer: "return=representation" },
    );
    if (!rows?.length)
      throw new Error(
        "Record unavailable or permission changed. Refresh before saving.",
      );
    return rows;
  }
}
