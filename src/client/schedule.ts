import { fetchApi } from "./base";

export type WaveType = "ENTRY" | "OFF";
export type ScheduleStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IWorkSchedule {
    id: number;
    workspaceId: number;
    createdBy: number;
    status: ScheduleStatus;
    mondayWave: WaveType;
    tuesdayWave: WaveType;
    wednesdayWave: WaveType;
    thursdayWave: WaveType;
    fridayWave: WaveType;
    saturdayWave: WaveType;
    sundayWave: WaveType;
    approvedBy: number | null;
    rejectedReason: string | null;
    year: number; // 연도
    week: number; // 주차
    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;
}

export interface ICreateWorkScheduleRequest {
    workspaceId: number;
    mondayWave: WaveType;
    tuesdayWave: WaveType;
    wednesdayWave: WaveType;
    thursdayWave: WaveType;
    fridayWave: WaveType;
    saturdayWave: WaveType;
    sundayWave: WaveType;
}

export interface IUpdateWorkScheduleRequest {
    mondayWave: WaveType;
    tuesdayWave: WaveType;
    wednesdayWave: WaveType;
    thursdayWave: WaveType;
    fridayWave: WaveType;
    saturdayWave: WaveType;
    sundayWave: WaveType;
}

export interface IApproveScheduleRequest {
    reason?: string;
}

export interface IApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    code: string;
}

export interface ISchedulesPaginationData {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    resultList: IWorkSchedule[];
}

export interface IPendingSchedulesResponse {
    code: number;
    status: string;
    data: ISchedulesPaginationData;
}

export interface IAllSchedulesResponse {
    success: boolean;
    message: string;
    data: IWorkSchedule[];
    code: string;
}

// 관리자용 API
export const getPendingSchedules = (page: number = 1, size: number = 10) => {
    return fetchApi.get<IPendingSchedulesResponse>(`/api/admin/schedules/pending`, {
        params: { page, size },
    });
};

export const getAllSchedulesByWorkspace = (workspaceId: number) => {
    return fetchApi.get<IAllSchedulesResponse>(`/api/admin/schedules/workspace/${workspaceId}`);
};

export const approveSchedule = (id: number) => {
    return fetchApi.put<IApiResponse<IWorkSchedule>>(`/api/admin/schedules/${id}/approve`);
};

export const rejectSchedule = (id: number, reason?: string) => {
    return fetchApi.put<IApiResponse<IWorkSchedule>>(`/api/admin/schedules/${id}/reject`, reason ? { reason } : {});
};

