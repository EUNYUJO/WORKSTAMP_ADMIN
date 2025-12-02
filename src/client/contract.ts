import { fetchApi } from "./base";

export interface IContract {
  id: number;
  affiliationId: number;
  name: string;
  phoneNumber: string;
  businessRegistrationNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateContractRequest {
  name: string;
  phoneNumber: string;
  businessRegistrationNumber: string;
  affiliationCode: string;
}

export interface IUpdateContractRequest {
  name: string;
  phoneNumber: string;
  businessRegistrationNumber: string;
  affiliationCode?: string;
}

export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code: string;
}

export interface IContractsPaginationData {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  resultList: IContract[];
}

export interface IAllContractsResponse {
  code: number;
  status: string;
  data: IContractsPaginationData;
}

export const createContract = (value: ICreateContractRequest) => {
  return fetchApi.post<IApiResponse<IContract>>(`/api/contracts`, value);
};

export const getAllContracts = (page: number = 1, size: number = 10) => {
  return fetchApi.get<IAllContractsResponse>(`/api/contracts`, {
    params: { page, size },
  });
};

export const getContract = (id: number) => {
  return fetchApi.get<IApiResponse<IContract>>(`/api/contracts/${id}`);
};

export const updateContract = (id: number, value: IUpdateContractRequest) => {
  return fetchApi.put<IApiResponse<IContract>>(`/api/contracts/${id}`, value);
};

export const deleteContract = (id: number) => {
  return fetchApi.delete<IApiResponse<null>>(`/api/contracts/${id}`);
};

