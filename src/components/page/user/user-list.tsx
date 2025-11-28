import { IUser, IUsersResponse, getUsers } from "@/client/user";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Dropdown, MenuProps, message, Select } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAllWorkspaces, IWorkspace } from "@/client/workspace";

const UserList = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [data, setData] = useState<IUsersResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  // 근무지 목록 가져오기
  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await getAllWorkspaces();
      setWorkspaces(response.data.data || []);
    } catch (err) {
      console.error("근무지 목록 조회 오류:", err);
    }
  }, []);

  // 근로자 목록 가져오기
  const fetchUsers = useCallback(
    async (workspaceId?: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getUsers(workspaceId ? { workspaceId } : undefined);
        setData(response.data);
      } catch (err: any) {
        setError(err);
        const errorMessage = err?.response?.data?.message || "근로자 목록을 불러오는 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [messageApi]
  );

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    fetchUsers(selectedWorkspaceId);
  }, [fetchUsers, selectedWorkspaceId]);

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

  const handleWorkspaceChange = useCallback(
    (value: number | undefined) => {
      setSelectedWorkspaceId(value);
    },
    []
  );

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

  const columns: ColumnsType<IUser> = [
    {
      title: "이름",
      dataIndex: "name",
      width: 150,
    },
    {
      title: "사용자명",
      dataIndex: "username",
      width: 150,
    },
    {
      title: "이메일",
      dataIndex: "email",
      width: 200,
    },
    {
      title: "권한",
      dataIndex: "role",
      width: 120,
      align: "center",
    },
    {
      title: "소속ID",
      dataIndex: "affiliationId",
      width: 120,
      align: "center",
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
          <Select
            placeholder="근무지 필터"
            allowClear
            style={{ width: 200, marginRight: 8 }}
            value={selectedWorkspaceId}
            onChange={handleWorkspaceChange}
          >
            {workspaces.map((workspace) => (
              <Select.Option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      </DefaultTableBtn>

      <DefaultTable<IUser>
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

export default React.memo(UserList);

