import { fetchApi } from "./base";

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
  code: string;
  message: string;
  data: T;
}

export interface IUsersResponse {
  code: string;
  message: string;
  data: IUser[];
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

