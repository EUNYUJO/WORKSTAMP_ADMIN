import { IUser, IUsersResponse, getUsers, getUserAttendanceHistory, IAttendanceResponse, exportAttendanceHistory } from "@/client/user";
import { IAffiliation, getAllAffiliations } from "@/client/affiliation";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Dropdown, MenuProps, message, Modal, Select, Table } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAllWorkspaces, IWorkspace } from "@/client/workspace";

const UserList = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [data, setData] = useState<IUsersResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [affiliations, setAffiliations] = useState<IAffiliation[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  // 근무 이력 모달 관련 상태
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<IAttendanceResponse[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize] = useState(10);
  const [attendanceTotal, setAttendanceTotal] = useState(0);

  // 근무지 목록 가져오기
  const fetchWorkspaces = useCallback(async () => {
    try {
      // 페이징 없이 모든 근무지 가져오기 (큰 사이즈로)
      const response = await getAllWorkspaces(1, 1000);
      const pagedResponse = response.data;
      setWorkspaces(pagedResponse.data?.resultList || []);
    } catch (err) {
      console.error("근무지 목록 조회 오류:", err);
      setWorkspaces([]);
    }
  }, []);

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
    fetchAffiliations();
  }, [fetchWorkspaces, fetchAffiliations]);

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

  // 근무 이력 조회
  const fetchAttendanceHistory = useCallback(
    async (userId: number, page: number = 1) => {
      try {
        setIsLoadingAttendance(true);
        const response = await getUserAttendanceHistory({
          userId,
          page,
          size: attendancePageSize
        });
        const pagedData = response.data.data;
        setAttendanceHistory(pagedData?.resultList || []);
        setAttendanceTotal(pagedData?.totalCount || 0);
        setAttendancePage(page);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || "근무 이력을 불러오는 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
        setAttendanceHistory([]);
        setAttendanceTotal(0);
      } finally {
        setIsLoadingAttendance(false);
      }
    },
    [messageApi, attendancePageSize]
  );

  // 이름 클릭 핸들러
  const handleNameClick = useCallback(
    (user: IUser) => {
      setSelectedUser(user);
      setAttendanceModalVisible(true);
      setAttendancePage(1);
      fetchAttendanceHistory(user.id, 1);
    },
    [fetchAttendanceHistory]
  );

  // 모달 닫기
  const handleModalClose = useCallback(() => {
    setAttendanceModalVisible(false);
    setSelectedUser(null);
    setAttendanceHistory([]);
    setAttendancePage(1);
    setAttendanceTotal(0);
  }, []);

  // 근무 이력 페이지 변경
  const handleAttendancePageChange = useCallback(
    (page: number) => {
      if (selectedUser) {
        fetchAttendanceHistory(selectedUser.id, page);
      }
    },
    [selectedUser, fetchAttendanceHistory]
  );

  // 엑셀 다운로드 (개별 사용자)
  const handleExportExcel = useCallback(async () => {
    try {
      messageApi.loading({ content: "엑셀 파일을 생성하는 중...", key: "export" });

      const blob = await exportAttendanceHistory({
        userId: selectedUser?.id,
        workspaceId: selectedWorkspaceId,
      });

      // Blob을 다운로드 링크로 변환
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `근무이력_${selectedUser?.name || "전체"}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      messageApi.success({ content: "엑셀 파일이 다운로드되었습니다.", key: "export" });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "엑셀 파일 다운로드 중 오류가 발생했습니다.";
      messageApi.error({ content: errorMessage, key: "export" });
    }
  }, [selectedUser, selectedWorkspaceId, messageApi]);

  // 전체 엑셀 다운로드
  const handleExportAllExcel = useCallback(async () => {
    try {
      messageApi.loading({ content: "엑셀 파일을 생성하는 중...", key: "exportAll" });

      const blob = await exportAttendanceHistory({
        workspaceId: selectedWorkspaceId,
      });

      // Blob을 다운로드 링크로 변환
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      const workspaceName = workspaces.find(w => w.id === selectedWorkspaceId)?.name || "전체";
      link.setAttribute("download", `근무이력_${workspaceName}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      messageApi.success({ content: "엑셀 파일이 다운로드되었습니다.", key: "exportAll" });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "엑셀 파일 다운로드 중 오류가 발생했습니다.";
      messageApi.error({ content: errorMessage, key: "exportAll" });
    }
  }, [selectedWorkspaceId, workspaces, messageApi]);

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
      render: (name: string, record: IUser) => {
        return (
          <a
            onClick={() => handleNameClick(record)}
            style={{ cursor: "pointer", color: "#1890ff" }}
          >
            {name}
          </a>
        );
      },
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
            {(workspaces || []).map((workspace) => (
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

      <Modal
        title={`${selectedUser?.name || ""} 근무 이력`}
        open={attendanceModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="export" type="primary" onClick={handleExportExcel}>
            엑셀 다운로드
          </Button>,
          <Button key="close" onClick={handleModalClose}>
            닫기
          </Button>,
        ]}
        width={1200}
      >
        <Table<IAttendanceResponse>
          columns={[
            {
              title: "근무일",
              dataIndex: "workDate",
              width: 120,
              render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
            },
            {
              title: "근무지",
              dataIndex: "workspaceId",
              width: 150,
              render: (workspaceId: number) => {
                const workspace = workspaces.find((w) => w.id === workspaceId);
                return workspace?.name || workspaceId;
              },
            },
            {
              title: "입차 시간",
              dataIndex: "entryTime",
              width: 150,
              render: (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-"),
            },
            {
              title: "Wave",
              dataIndex: "wave",
              width: 100,
              align: "center",
              render: (wave: string | null) => {
                if (!wave) return "-";
                const waveMap: Record<string, string> = {
                  WAVE1: "Wave1(야간)",
                  WAVE2: "Wave2(주간)",
                  OFF: "휴무",
                };
                return waveMap[wave] || wave;
              },
            },
            {
              title: "휴식 시작",
              dataIndex: "breakStartTime",
              width: 150,
              render: (value: string | null) => (value ? dayjs(value).format("HH:mm") : "-"),
            },
            {
              title: "휴식 종료",
              dataIndex: "breakEndTime",
              width: 150,
              render: (value: string | null) => (value ? dayjs(value).format("HH:mm") : "-"),
            },
            {
              title: "배송 종료",
              dataIndex: "deliveryEndTime",
              width: 150,
              render: (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-"),
            },
            {
              title: "출차 횟수",
              dataIndex: "departures",
              width: 100,
              align: "center",
              render: (departures: any[]) => departures?.length || 0,
            },
            {
              title: "상태",
              dataIndex: "status",
              width: 100,
              align: "center",
              render: (status: string) => {
                const statusMap: Record<string, string> = {
                  PRESENT: "출근",
                  ABSENT: "결근",
                  LATE: "지각",
                  EARLY_LEAVE: "조퇴",
                };
                return statusMap[status] || status;
              },
            },
            {
              title: "오차 개수",
              dataIndex: "discrepancyCount",
              width: 100,
              align: "center",
              render: (value: number | null) => value !== null ? value : "-",
            },
            {
              title: "오차 메모",
              dataIndex: "discrepancyReason",
              width: 200,
              render: (value: string | null) => value || "-",
            },
            {
              title: "메모",
              dataIndex: "memo",
              render: (value: string | null) => value || "-",
            },
          ]}
          dataSource={attendanceHistory}
          loading={isLoadingAttendance}
          rowKey="attendanceId"
          pagination={{
            current: attendancePage,
            pageSize: attendancePageSize,
            total: attendanceTotal,
            showSizeChanger: false,
            onChange: handleAttendancePageChange,
          }}
          scroll={{ x: 1000 }}
        />
      </Modal>
    </>
  );
};

export default React.memo(UserList);

