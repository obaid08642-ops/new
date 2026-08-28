import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const HttpClient = axios.create({
  baseURL: 'https://api.nabdahplus.com/api/v1',
  timeout: 15000,
});

// Custom global retry interceptor for 5xx and network errors
HttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    if (!config) return Promise.reject(error);

    config._retryCount = config._retryCount || 0;

    const shouldRetry = !error.response || error.response.status >= 500;
    
    if (shouldRetry && config._retryCount < 3) {
      config._retryCount += 1;
      const delay = Math.pow(2, config._retryCount) * 1000;
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      return HttpClient(config);
    }
    
    return Promise.reject(error);
  }
);
