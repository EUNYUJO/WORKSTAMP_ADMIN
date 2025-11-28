import { fetchApi } from "./base";

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponseData {
  accessToken: string;
  refreshToken: string;
}

export interface IApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface IRefreshRequest {
  refreshToken: string;
}

export interface IRefreshResponseData {
  accessToken: string;
}

export const login = (request: ILoginRequest) => {
  return fetchApi.post<IApiResponse<ILoginResponseData>>(`/login`, request);
};

export const refreshToken = (request: IRefreshRequest) => {
  return fetchApi.post<IApiResponse<IRefreshResponseData>>(`/refresh`, request);
};

