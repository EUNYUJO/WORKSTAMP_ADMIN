import { fetchApi } from "./base";
import axios from "axios";
import { getSession } from "next-auth/react";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://3.39.247.194";

export interface IUser {
  id: number;
  email: string;
  name: string;
  username: string;
  affiliationId: number;
  role: string;
  createdAt: string;
}

export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  code: string | null;
}

export interface IUsersResponse {
  success: boolean;
  message: string;
  data: IUser[] | null;
  code: string | null;
}

export interface IGetUsersParams {
  workspaceId?: number;
}

export const getUsers = (params?: IGetUsersParams) => {
  const queryParams = new URLSearchParams();
  if (params?.workspaceId) {
    queryParams.append("workspaceId", params.workspaceId.toString());
  }
  const queryString = queryParams.toString();
  const url = `/api/admin/users${queryString ? `?${queryString}` : ""}`;
  return fetchApi.get<IUsersResponse>(url);
};

export interface IDepartureResponse {
  id: number;
  departureTime: string;
  departureLoadCount: number;
  departureReturnCount: number;
  memo: string | null;
  createdAt: string;
}

export type WaveType = "WAVE1" | "WAVE2" | "OFF";

export interface IAttendanceResponse {
  attendanceId: number;
  userId: number;
  workspaceId: number;
  workDate: string;
  entryTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  deliveryEndTime: string | null;
  departures: IDepartureResponse[];
  status: "PRESENT" | "ABSENT" | "LATE" | "EARLY_LEAVE";
  memo: string | null;
  createdAt: string;
  wave: WaveType | null;
  discrepancyCount: number | null; // 오차 개수
  discrepancyReason: string | null; // 오차 사유
}

export interface IPagedData<T> {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  resultList: T[];
}

export interface IPagedResponse<T> {
  code: number;
  status: string;
  data: IPagedData<T>;
}

export interface IGetUserAttendanceHistoryParams {
  userId: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export const getUserAttendanceHistory = (params: IGetUserAttendanceHistoryParams) => {
  const queryParams = new URLSearchParams();
  if (params.startDate) {
    queryParams.append("startDate", params.startDate);
  }
  if (params.endDate) {
    queryParams.append("endDate", params.endDate);
  }
  if (params.page) {
    queryParams.append("page", params.page.toString());
  }
  if (params.size) {
    queryParams.append("size", params.size.toString());
  }
  const queryString = queryParams.toString();
  const url = `/api/admin/users/${params.userId}/attendance/history${queryString ? `?${queryString}` : ""}`;
  return fetchApi.get<IPagedResponse<IAttendanceResponse>>(url);
};

export interface IExportAttendanceHistoryParams {
  userId?: number;
  workspaceId?: number;
  startDate?: string;
  endDate?: string;
}

export const exportAttendanceHistory = async (params?: IExportAttendanceHistoryParams) => {
  const queryParams = new URLSearchParams();
  if (params?.userId) {
    queryParams.append("userId", params.userId.toString());
  }
  if (params?.workspaceId) {
    queryParams.append("workspaceId", params.workspaceId.toString());
  }
  if (params?.startDate) {
    queryParams.append("startDate", params.startDate);
  }
  if (params?.endDate) {
    queryParams.append("endDate", params.endDate);
  }
  const queryString = queryParams.toString();
  const url = `${API_ENDPOINT}/api/admin/attendance/export${queryString ? `?${queryString}` : ""}`;
  
  const session = await getSession();
  const response = await axios.get(url, {
    responseType: "blob",
    headers: {
      ...(session?.accessToken && { Authorization: `Bearer ${session.accessToken}` }),
    },
    withCredentials: true,
  });
  
  return response.data;
};

