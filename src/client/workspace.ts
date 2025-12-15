import { fetchApi } from "./base";

export interface IWorkspace {
  id: number;
  name: string;
  description?: string;
  postNo: string;
  basicAddr: string;
  addrDetail: string;
  region?: string;
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
  region?: string;
}

export interface IUpdateWorkspaceRequest {
  name: string;
  description?: string;
  postNo: string;
  basicAddr: string;
  addrDetail: string;
  region?: string;
}

export interface IApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface IWorkspacesPaginationData {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  resultList: IWorkspace[];
}

export interface IPagedWorkspacesResponse {
  code: number;
  status: string;
  data: IWorkspacesPaginationData;
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

export const getAllWorkspaces = (page: number = 1, size: number = 10, region?: string) => {
  return fetchApi.get<IPagedWorkspacesResponse>(`/api/admin/workspaces`, {
    params: { page, size, ...(region && { region }) },
  });
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

