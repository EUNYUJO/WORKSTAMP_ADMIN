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

export interface ICreateAffiliationRequest {
  code: string;
  name: string;
  description?: string;
}

export interface IUpdateAffiliationRequest {
  name: string;
  description?: string;
}

export interface ICreateAffiliationResponse {
  code: string;
  message: string;
  data: IAffiliation;
}

export interface IUpdateAffiliationResponse {
  code: string;
  message: string;
  data: IAffiliation;
}

export interface IDeleteAffiliationResponse {
  code: string;
  message: string;
  data: null;
}

export const getAllAffiliations = () => {
  return fetchApi.get<IAllAffiliationsResponse>(`/api/admin/affiliations`);
};

export const createAffiliation = (value: ICreateAffiliationRequest) => {
  return fetchApi.post<ICreateAffiliationResponse>(`/api/admin/affiliations`, value);
};

export const updateAffiliation = (id: number, value: IUpdateAffiliationRequest) => {
  return fetchApi.put<IUpdateAffiliationResponse>(`/api/admin/affiliations/${id}`, value);
};

export const deleteAffiliation = (id: number) => {
  return fetchApi.delete<IDeleteAffiliationResponse>(`/api/admin/affiliations/${id}`);
};

