// API Configuration
// Change this to your deployed backend URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://deontic-llm-lgraph.onrender.com";

// API Endpoints
export const API_ENDPOINTS = {
  status: `${API_BASE_URL}/api/status`,
  chat: `${API_BASE_URL}/api/chat`,
  clauses: `${API_BASE_URL}/api/clauses`,
  clause: (id: string) => `${API_BASE_URL}/api/clause/${id}`,
  clausesExport: `${API_BASE_URL}/api/clauses/export`,
  graph: `${API_BASE_URL}/api/graph`,
};
