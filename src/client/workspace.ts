import { fetchApi } from "./base";

export interface IWorkspace {
  id: number;
  name: string;
  description?: string;
  postNo: string;
  basicAddr: string;
  addrDetail: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface ICreateWorkspaceRequest {
  name: string;
  description?: string;
  postNo: string;
  basicAddr: string;
  addrDetail: string;
}

export interface IUpdateWorkspaceRequest {
  name: string;
  description?: string;
  postNo: string;
  basicAddr: string;
  addrDetail: string;
}

export interface IApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface IAllWorkspacesResponse {
  code: string;
  message: string;
  data: IWorkspace[];
}

export interface IDeleteWorkspaceResponse {
  code: string;
  message: string;
  data: null;
}

export const createWorkspace = (value: ICreateWorkspaceRequest) => {
  return fetchApi.post<IApiResponse<IWorkspace>>(`/api/admin/workspaces`, value);
};

export const getAllWorkspaces = () => {
  return fetchApi.get<IAllWorkspacesResponse>(`/api/admin/workspaces`);
};

export const getWorkspace = (id: number) => {
  return fetchApi.get<IApiResponse<IWorkspace>>(`/api/admin/workspaces/${id}`);
};

export const updateWorkspace = (id: number, value: IUpdateWorkspaceRequest) => {
  return fetchApi.put<IApiResponse<IWorkspace>>(`/api/admin/workspaces/${id}`, value);
};

export const deleteWorkspace = (id: number) => {
  return fetchApi.delete<IDeleteWorkspaceResponse>(`/api/admin/workspaces/${id}`);
};

