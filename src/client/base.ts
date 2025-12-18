import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://3.39.247.194";

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

// Response interceptor to handle errors
fetchApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 네트워크 에러 처리
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('API 서버에 연결할 수 없습니다:', error.message);
      return Promise.reject(new Error('API 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.'));
    }

    // 401 Unauthorized - 인증 토큰 만료 또는 없음
    if (error.response?.status === 401) {
      console.error('인증이 필요합니다:', error.response?.data);
      // 필요시 로그인 페이지로 리다이렉트
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('인증이 필요합니다. 다시 로그인해주세요.'));
    }

    // 403 Forbidden - 권한 없음
    if (error.response?.status === 403) {
      console.error('접근 권한이 없습니다:', error.response?.data);
      return Promise.reject(new Error(error.response?.data?.message || '접근 권한이 없습니다.'));
    }

    // 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('서버 오류:', error.response?.data);
      return Promise.reject(new Error(error.response?.data?.message || '서버 오류가 발생했습니다.'));
    }

    // 기타 에러
    console.error('API 호출 실패:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
