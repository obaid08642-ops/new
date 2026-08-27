import axios from 'axios';
import { API_BASE } from '../constants';
import { buildHeaders, Tokens, Vault, SK } from '../security/Security';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Request Interceptor: Automatically inject secure headers and JWT token
client.interceptors.request.use(
 async (config) => {
 try {
 const customIp = await Vault.get(SK.CUSTOM_API_IP);
 if (customIp) {
   config.baseURL = `http://${customIp}:8002/api/v1`;
 }
 const secureHeaders = await buildHeaders(true);
 config.headers = {
 ...config.headers,
 ...secureHeaders,
 } as any;
 } catch (e) {
 if (__DEV__) console.warn('[API Client Request Interceptor Error]', e);
 }
 return config;
 },
 (error) => Promise.reject(error)
);

// Response Interceptor: Handle token expiration and standard error routing
client.interceptors.response.use(
 (response) => response,
 async (error) => {
 const originalRequest = error.config;
 
 // If unauthorized (401) and not already retrying, session expired
 if (error.response?.status === 401 && !originalRequest._retry) {
 originalRequest._retry = true;
 try {
 // Clear expired tokens if session can't be refreshed
 await Tokens.clear();
 } catch (e) {
 if (__DEV__) console.warn('[API Client Session Clear Error]', e);
 }
 }
 
 return Promise.reject(error.response?.data || error);
 }
);

export default client;
