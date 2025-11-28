import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://43.203.137.231:8081";

export const fetcher = async (input: URL | RequestInfo, init?: AxiosRequestConfig | undefined) => {
  const url = typeof input === "string" ? input : input.toString();
  const session = await getSession();
  const config: AxiosRequestConfig = {
    ...init,
    headers: {
      ...init?.headers,
      ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` }),
    },
  };
  const response = await axios.get(`${API_ENDPOINT}/${url}`, config);
  return response.data;
};

export const fetchApi: AxiosInstance = axios.create({
  baseURL: API_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add auth token
fetchApi.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
