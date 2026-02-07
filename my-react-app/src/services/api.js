import axios from "axios";

// IMPORTANT: Replace this with YOUR actual API URL
const API_BASE_URL = "http://localhost:3000/api";
// OR use your production URL:
// const API_BASE_URL = 'http://YOUR-API-URL:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Shops API
export const shopsAPI = {
  getAll: () => api.get("/shops"),
  getById: (id) => api.get(`/shops/${id}`),
  getNearby: (lat, lng, radius = 5) =>
    api.get(`/shops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
};

// Products API
export const productsAPI = {
  getByShop: (shopId) => api.get(`/products/shops/${shopId}/products`),
  getById: (id) => api.get(`/products/${id}`),
};

// Customers API
export const customersAPI = {
  getTrustScore: (customerId) =>
    api.get(`/customers/${customerId}/trust-score`),
};

// ML API
export const mlAPI = {
  getForecast: (shopId, productId) =>
    api.get(`/ml/forecast/${shopId}/${productId}`),
  getReorderAlerts: (shopId) => api.get(`/ml/reorder-alerts/${shopId}`),
};

export default api;
