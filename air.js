const BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "leaddesk.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new Error(data.message || "The request failed. Try again.");
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  listLeads: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v && v !== "all")
    ).toString();
    return request(`/leads${qs ? `?${qs}` : ""}`);
  },
  stats: () => request("/leads/stats"),
  getLead: (id) => request(`/leads/${id}`),
  createLead: (body) => request("/leads", { method: "POST", body }),
  updateLead: (id, body) => request(`/leads/${id}`, { method: "PUT", body }),
  deleteLead: (id) => request(`/leads/${id}`, { method: "DELETE" }),
  addNote: (id, body) => request(`/leads/${id}/notes`, { method: "POST", body }),
};

/* ---------------- shared constants and helpers ---------------- */
export const STAGES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "converted", label: "Converted" },
  { id: "lost", label: "Lost" },
];

export const SOURCES = [
  "Contact form", "Pricing page", "Referral", "LinkedIn", "Cold email", "Webinar", "Other",
];

export const stageLabel = (id) => STAGES.find((s) => s.id === id)?.label ?? id;

export const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export const dateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export const isOverdue = (lead) =>
  Boolean(lead.followUpDate) &&
  ["new", "contacted"].includes(lead.status) &&
  new Date(lead.followUpDate) < new Date(new Date().toDateString());

export const money = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : "—");
