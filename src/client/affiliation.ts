import { fetchApi } from "./base";

export interface IAffiliation {
  id: number;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface IAllAffiliationsResponse {
  code: string;
  message: string;
  data: IAffiliation[];
}

export const getAllAffiliations = () => {
  return fetchApi.get<IAllAffiliationsResponse>(`/api/admin/affiliations`);
};

