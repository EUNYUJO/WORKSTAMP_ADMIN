import { IAllContractsResponse, IContract, getAllContracts, deleteContract } from "@/client/contract";
import { IAffiliation, getAllAffiliations, createAffiliation, ICreateAffiliationRequest } from "@/client/affiliation";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Dropdown, MenuProps, Popconfirm, message, Modal, Form, Input } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const ContractList = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [data, setData] = useState<IAllContractsResponse | null>(null);
  const [affiliations, setAffiliations] = useState<IAffiliation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [isAffiliationModalOpen, setIsAffiliationModalOpen] = useState(false);
  const [affiliationForm] = Form.useForm<ICreateAffiliationRequest>();
  const [isCreatingAffiliation, setIsCreatingAffiliation] = useState(false);
  const router = useRouter();

  const currentPage = Number(router.query.page || 1);
  const pageSize = 10;

  // 소속 목록 조회
  const fetchAffiliations = useCallback(async () => {
    try {
      const response = await getAllAffiliations();
      setAffiliations(response.data.data || []);
    } catch (err) {
      console.error("소속 목록 조회 실패:", err);
    }
  }, []);

  // 소속 ID로 소속 이름 찾기
  const getAffiliationName = useCallback(
    (affiliationId: number) => {
      const affiliation = affiliations.find((aff) => aff.id === affiliationId);
      return affiliation?.name || affiliationId.toString();
    },
    [affiliations]
  );

  const fetchContracts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAllContracts(currentPage, pageSize);
      setData(response.data);
    } catch (err: any) {
      setError(err);
      const errorMessage = err?.response?.data?.message || "계약서 목록을 불러오는 중 오류가 발생했습니다.";
      messageApi.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [messageApi, currentPage, pageSize]);

  useEffect(() => {
    fetchContracts();
    fetchAffiliations();
  }, [fetchContracts, fetchAffiliations]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteContract(id);
        messageApi.success("계약서가 삭제되었습니다.");
        // 목록 다시 불러오기
        await fetchContracts();
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || "계약서 삭제 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      }
    },
    [fetchContracts, messageApi]
  );

  const handleChangePage = useCallback(
    (pageNumber: number) => {
      router.push({
        pathname: router.pathname,
        query: { ...router.query, page: pageNumber },
      });
    },
    [router]
  );

  const handleCreateAffiliation = useCallback(async (values: ICreateAffiliationRequest) => {
    try {
      setIsCreatingAffiliation(true);
      await createAffiliation(values);
      messageApi.success("소속이 등록되었습니다.");
      setIsAffiliationModalOpen(false);
      affiliationForm.resetFields();
      // 소속 목록 다시 불러오기
      await fetchAffiliations();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "소속 등록 중 오류가 발생했습니다.";
      messageApi.error(errorMessage);
    } finally {
      setIsCreatingAffiliation(false);
    }
  }, [messageApi, affiliationForm, fetchAffiliations]);

  const onSelectChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const modifyDropdownItems: MenuProps["items"] = useMemo(
    () => [
      {
        key: "statusUpdate",
        label: <a onClick={() => console.log(selectedRowKeys)}>상태수정</a>,
      },
    ],
    [selectedRowKeys]
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };
  const hasSelected = selectedRowKeys.length > 0;

  const columns: ColumnsType<IContract> = [
    {
      key: "action",
      width: 120,
      align: "center",
      render: (_value: unknown, record: IContract) => {
        return (
          <span className="flex justify-center gap-2">
            <a
              className="px-2 py-1 text-sm btn"
              onClick={() => {
                // 목록에서 가져온 해당 아이템 데이터를 그대로 저장
                const dataToStore = JSON.stringify(record);
                sessionStorage.setItem("contractEditData", dataToStore);
                console.log("계약서 데이터 저장:", record);
                // 저장 후 페이지 이동
                router.push(`/contract/edit/${record.id}`);
              }}
            >
              수정
            </a>
            <Popconfirm
              title="계약서를 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record.id)}
              okText="예"
              cancelText="아니오"
            >
              <a className="px-2 py-1 text-sm btn">삭제</a>
            </Popconfirm>
          </span>
        );
      },
    },
    {
      title: "이름",
      dataIndex: "name",
      width: 150,
    },
    {
      title: "전화번호",
      dataIndex: "phoneNumber",
      width: 150,
    },
    {
      title: "계약자코드",
      dataIndex: "contractorCode",
      width: 150,
    },
    {
      title: "지역",
      dataIndex: "region",
      width: 120,
    },
    {
      title: "배송앱ID",
      dataIndex: "deliveryAppId",
      width: 150,
    },
    {
      title: "차량번호",
      dataIndex: "vehicleNumber",
      width: 120,
    },
    {
      title: "소속",
      dataIndex: "affiliationId",
      width: 150,
      align: "center",
      render: (affiliationId: number) => {
        return getAffiliationName(affiliationId);
      },
    },
    {
      title: "생성일시",
      dataIndex: "createdAt",
      align: "center",
      width: 120,
      render: (value: ISO8601DateTime) => {
        return (
          <div className="text-sm">
            <span className="block">{dayjs(value).format("YYYY/MM/DD")}</span>
            <span className="block">{dayjs(value).format("hh:mm")}</span>
          </div>
        );
      },
    },
    {
      title: "수정일시",
      dataIndex: "updatedAt",
      align: "center",
      width: 120,
      render: (value: ISO8601DateTime) => {
        return (
          <div className="text-sm">
            <span className="block">{dayjs(value).format("YYYY/MM/DD")}</span>
            <span className="block">{dayjs(value).format("hh:mm")}</span>
          </div>
        );
      },
    },
  ];

  if (error) {
    return <Alert message="데이터 로딩 중 오류가 발생했습니다." type="warning" />;
  }

  return (
    <>
      {contextHolder}
      <DefaultTableBtn className="justify-between">
        <div>
          <span style={{ marginLeft: 8 }}>{hasSelected ? `${selectedRowKeys.length}건 선택` : ""}</span>
        </div>

        <div className="flex-item-list">
          <Button onClick={() => setIsAffiliationModalOpen(true)}>
            소속 등록
          </Button>
          <Button type="primary" onClick={() => router.push("/contract/new")}>
            계약서 등록
          </Button>
        </div>
      </DefaultTableBtn>

      <DefaultTable<IContract>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data?.data?.resultList || []}
        loading={isLoading}
        pagination={{
          current: data?.data?.currentPage || Number(router.query.page || 1),
          defaultPageSize: 10,
          total: data?.data?.totalCount || 0,
          showSizeChanger: false,
          onChange: handleChangePage,
        }}
        className="mt-3"
        countLabel={data?.data?.totalCount || 0}
      />

      <Modal
        title="소속 등록"
        open={isAffiliationModalOpen}
        onCancel={() => {
          setIsAffiliationModalOpen(false);
          affiliationForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={affiliationForm}
          layout="vertical"
          onFinish={handleCreateAffiliation}
        >
          <Form.Item
            label="소속 번호"
            name="code"
            rules={[
              { required: true, message: "소속 번호를 입력해주세요" },
              { pattern: /^[0-9]{6}$/, message: "소속 번호는 6자리 숫자여야 합니다" },
            ]}
          >
            <Input placeholder="소속 번호를 입력하세요 (6자리 숫자)" maxLength={6} />
          </Form.Item>

          <Form.Item
            label="소속 이름"
            name="name"
            rules={[
              { required: true, message: "소속 이름을 입력해주세요" },
              { max: 200, message: "소속 이름은 200자 이하여야 합니다" },
            ]}
          >
            <Input placeholder="소속 이름을 입력하세요" maxLength={200} />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
            rules={[
              { max: 500, message: "설명은 500자 이하여야 합니다" },
            ]}
          >
            <Input.TextArea
              placeholder="소속 설명을 입력하세요 (선택사항)"
              rows={4}
              maxLength={500}
            />
          </Form.Item>

          <Form.Item className="text-right mb-0">
            <Button
              onClick={() => {
                setIsAffiliationModalOpen(false);
                affiliationForm.resetFields();
              }}
              style={{ marginRight: 8 }}
            >
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={isCreatingAffiliation}>
              등록
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default React.memo(ContractList);

