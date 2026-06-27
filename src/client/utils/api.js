import axios from 'axios';

const api = axios.create({
  baseURL: '', // Using empty string to let it hit the Vite local proxy server `/api`
});

// Intercept all requests and attach the bearer token if it exists in local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
