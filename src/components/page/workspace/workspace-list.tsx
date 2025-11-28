import { IAllWorkspacesResponse, IWorkspace, getAllWorkspaces, deleteWorkspace } from "@/client/workspace";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Dropdown, MenuProps, Popconfirm, message } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const WorkspaceList = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [data, setData] = useState<IAllWorkspacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAllWorkspaces();
      setData(response.data);
    } catch (err: any) {
      setError(err);
      const errorMessage = err?.response?.data?.message || "근무지 목록을 불러오는 중 오류가 발생했습니다.";
      messageApi.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteWorkspace(id);
        messageApi.success("근무지가 삭제되었습니다.");
        // 목록 다시 불러오기
        await fetchWorkspaces();
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || "근무지 삭제 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      }
    },
    [fetchWorkspaces, messageApi]
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

  const columns: ColumnsType<IWorkspace> = [
    {
      key: "action",
      width: 120,
      align: "center",
      render: (_value: unknown, record: IWorkspace) => {
        return (
          <span className="flex justify-center gap-2">
            <a className="px-2 py-1 text-sm btn" onClick={() => alert("수정")}>
              수정
            </a>
            <Popconfirm
              title="근무지를 삭제하시겠습니까?"
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
      title: "근무지명",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "주소",
      render: (_value: unknown, record: IWorkspace) => {
        return `${record.basicAddr} ${record.addrDetail}`;
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
          <Dropdown disabled={!hasSelected} menu={{ items: modifyDropdownItems }} trigger={["click"]}>
            <Button>일괄수정</Button>
          </Dropdown>

          <span style={{ marginLeft: 8 }}>{hasSelected ? `${selectedRowKeys.length}건 선택` : ""}</span>
        </div>

        <div className="flex-item-list">

          <Button type="primary" onClick={() => router.push("/workplace/new")}>
            근무지 등록
          </Button>
        </div>
      </DefaultTableBtn>

      <DefaultTable<IWorkspace>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        pagination={{
          current: Number(router.query.page || 1),
          defaultPageSize: 10,
          total: data?.data?.length || 0,
          showSizeChanger: false,
          onChange: handleChangePage,
        }}
        className="mt-3"
        countLabel={data?.data?.length || 0}
      />
    </>
  );
};

export default React.memo(WorkspaceList);

