import { IAllWorkspacesResponse, IWorkspace, getAllWorkspaces, deleteWorkspace } from "@/client/workspace";
import { IWorkSchedule, IPendingSchedulesResponse, getPendingSchedules, getAllSchedulesByWorkspace, approveSchedule, rejectSchedule } from "@/client/schedule";
import { IUser, getUsers } from "@/client/user";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Dropdown, Input, MenuProps, Modal, Popconfirm, Tag, Tabs, message } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const { TextArea } = Input;

const WorkspaceList = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [data, setData] = useState<IAllWorkspacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  // 스케줄 관련 상태
  const [scheduleData, setScheduleData] = useState<IPendingSchedulesResponse | null>(null);
  const [workspaceSchedules, setWorkspaceSchedules] = useState<IWorkSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [users, setUsers] = useState<IUser[]>([]);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<IWorkSchedule | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("workspaces");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);

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

  // 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    try {
      const response = await getUsers();
      // axios 응답 구조: response.data는 IUsersResponse 타입
      // 백엔드 ApiResponse 구조: { success, message, data: IUser[] | null, code }
      const usersResponse = response.data;
      if (usersResponse?.data && Array.isArray(usersResponse.data)) {
        setUsers(usersResponse.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("사용자 목록 조회 실패:", err);
      setUsers([]);
    }
  }, []);

  // 사용자 ID로 이름 찾기
  const getUserName = useCallback(
    (userId: number) => {
      const user = users.find((u) => u.id === userId);
      return user?.name || user?.username || userId.toString();
    },
    [users]
  );

  // 스케줄 목록 조회 (전체 승인 대기)
  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoadingSchedules(true);
      const response = await getPendingSchedules(1, 100);
      setScheduleData(response.data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "스케줄 목록을 불러오는 중 오류가 발생했습니다.";
      messageApi.error(errorMessage);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [messageApi]);

  // 근무지별 스케줄 조회
  const fetchSchedulesByWorkspace = useCallback(async (workspaceId: number) => {
    try {
      setIsLoadingSchedules(true);
      const response = await getAllSchedulesByWorkspace(workspaceId);
      // 승인 대기 상태만 필터링
      const pendingSchedules = (response.data?.data || []).filter(
        (schedule) => schedule.status === "PENDING"
      );
      setWorkspaceSchedules(pendingSchedules);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "스케줄 목록을 불러오는 중 오류가 발생했습니다.";
      messageApi.error(errorMessage);
      setWorkspaceSchedules([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [messageApi]);

  // WAVE 타입 표시
  const getWaveTypeTag = (waveType: string) => {
    switch (waveType) {
      case "WAVE1":
        return <Tag color="blue">야간</Tag>;
      case "WAVE2":
        return <Tag color="green">주간</Tag>;
      case "OFF":
        return <Tag color="default">휴무</Tag>;
      default:
        return <Tag>{waveType}</Tag>;
    }
  };

  const handleApproveSchedule = useCallback(
    async (schedule: IWorkSchedule) => {
      try {
        await approveSchedule(schedule.id);
        messageApi.success("스케줄이 승인되었습니다.");
        if (selectedWorkspaceId) {
          await fetchSchedulesByWorkspace(selectedWorkspaceId);
        } else {
          await fetchSchedules();
        }
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || "스케줄 승인 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      }
    },
    [fetchSchedules, fetchSchedulesByWorkspace, selectedWorkspaceId, messageApi]
  );

  const handleRejectSchedule = useCallback(
    async (schedule: IWorkSchedule) => {
      setSelectedSchedule(schedule);
      setRejectReason("");
      setRejectModalVisible(true);
    },
    []
  );

  const confirmRejectSchedule = useCallback(async () => {
    if (!selectedSchedule) return;

    try {
      await rejectSchedule(selectedSchedule.id, rejectReason || undefined);
      messageApi.success("스케줄이 거부되었습니다.");
      setRejectModalVisible(false);
      setSelectedSchedule(null);
      setRejectReason("");
      if (selectedWorkspaceId) {
        await fetchSchedulesByWorkspace(selectedWorkspaceId);
      } else {
        await fetchSchedules();
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "스케줄 거부 중 오류가 발생했습니다.";
      messageApi.error(errorMessage);
    }
  }, [selectedSchedule, rejectReason, fetchSchedules, fetchSchedulesByWorkspace, selectedWorkspaceId, messageApi]);

  useEffect(() => {
    fetchWorkspaces();
    fetchUsers();
    if (!selectedWorkspaceId) {
      fetchSchedules();
    }
  }, [fetchWorkspaces, fetchUsers, fetchSchedules, selectedWorkspaceId]);

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
            <a
              className="px-2 py-1 text-sm btn"
              onClick={() => {
                // 목록에서 가져온 해당 아이템 데이터를 그대로 저장
                const dataToStore = JSON.stringify(record);
                sessionStorage.setItem("workspaceEditData", dataToStore);
                console.log("근무지 데이터 저장:", record);
                // 저장 후 페이지 이동
                router.push(`/workplace/edit/${record.id}`);
              }}
            >
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
      render: (name: string, record: IWorkspace) => (
        <a
          onClick={() => {
            setSelectedWorkspaceId(record.id);
            setActiveTab("schedules");
            fetchSchedulesByWorkspace(record.id);
          }}
          style={{ cursor: "pointer", color: "#1890ff" }}
        >
          {name}
        </a>
      ),
    },
    {
      title: "설명",
      dataIndex: "description",
      width: 250,
      render: (value: string | null | undefined) => {
        return value || <span className="text-gray-400">-</span>;
      },
    },
    {
      title: "주소",
      render: (_value: unknown, record: IWorkspace) => {
        return `${record.basicAddr} ${record.addrDetail}`;
      },
    },
    {
      title: "지역",
      dataIndex: "region",
      width: 120,
      render: (value: string | null | undefined) => {
        return value || <span className="text-gray-400">-</span>;
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

  // 스케줄 테이블 컬럼
  const scheduleColumns: ColumnsType<IWorkSchedule> = [
    {
      key: "action",
      title: "작업",
      width: 150,
      fixed: "left",
      render: (_, record) => (
        <DefaultTableBtn>
          <Popconfirm
            title="스케줄 승인"
            description="이 스케줄을 승인하시겠습니까?"
            onConfirm={() => handleApproveSchedule(record)}
            okText="승인"
            cancelText="취소"
          >
            <Button type="primary" size="small" style={{ marginRight: 8 }}>
              승인
            </Button>
          </Popconfirm>
          <Button type="default" size="small" danger onClick={() => handleRejectSchedule(record)}>
            거부
          </Button>
        </DefaultTableBtn>
      ),
    },
    {
      key: "workspaceId",
      title: "근무지",
      dataIndex: "workspaceId",
      width: 150,
      render: (workspaceId: number) => {
        const workspace = data?.data?.find((ws) => ws.id === workspaceId);
        return workspace?.name || workspaceId.toString();
      },
    },
    {
      key: "createdBy",
      title: "신청인",
      dataIndex: "createdBy",
      width: 120,
      render: (userId: number) => getUserName(userId),
    },
    {
      key: "year",
      title: "연도",
      dataIndex: "year",
      width: 80,
      render: (year: number) => `${year}년`,
    },
    {
      key: "week",
      title: "주차",
      dataIndex: "week",
      width: 80,
      render: (week: number) => `${week}주차`,
    },
    {
      key: "sundayWave",
      title: "일",
      dataIndex: "sundayWave",
      width: 80,
      render: (wave: string) => getWaveTypeTag(wave),
    },
    {
      key: "mondayWave",
      title: "월",
      dataIndex: "mondayWave",
      width: 80,
      render: (wave: string) => getWaveTypeTag(wave),
    },
    {
      key: "tuesdayWave",
      title: "화",
      dataIndex: "tuesdayWave",
      width: 80,
      render: (wave: string) => getWaveTypeTag(wave),
    },
    {
      key: "wednesdayWave",
      title: "수",
      dataIndex: "wednesdayWave",
      width: 80,
      render: (wave: string) => getWaveTypeTag(wave),
    },
    {
      key: "thursdayWave",
      title: "목",
      dataIndex: "thursdayWave",
      width: 80,
      render: (wave: string) => getWaveTypeTag(wave),
    },
    {
      key: "fridayWave",
      title: "금",
      dataIndex: "fridayWave",
      width: 80,
      render: (wave: string) => getWaveTypeTag(wave),
    },
    {
      key: "saturdayWave",
      title: "토",
      dataIndex: "saturdayWave",
      width: 80,
      render: (wave: string) => getWaveTypeTag(wave),
    },
    {
      key: "createdAt",
      title: "신청일시",
      dataIndex: "createdAt",
      width: 180,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  if (error) {
    return <Alert message="데이터 로딩 중 오류가 발생했습니다." type="warning" />;
  }

  return (
    <>
      {contextHolder}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "workspaces",
            label: "근무지 목록",
            children: (
              <>
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
            ),
          },
          {
            key: "schedules",
            label: "스케줄 승인",
            children: (
              <>
                {selectedWorkspaceId ? (
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      onClick={() => {
                        setSelectedWorkspaceId(null);
                        fetchSchedules();
                      }}
                      style={{ marginBottom: 16 }}
                    >
                      전체 스케줄 보기
                    </Button>
                    <div style={{ marginBottom: 8 }}>
                      <strong>
                        선택된 근무지:{" "}
                        {data?.data?.find((ws) => ws.id === selectedWorkspaceId)?.name || selectedWorkspaceId}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: "#666", marginBottom: 8 }}>
                      근무지 목록에서 근무지명을 클릭하면 해당 근무지의 스케줄만 표시됩니다.
                    </div>
                  </div>
                )}
                <DefaultTable
                  columns={scheduleColumns}
                  dataSource={
                    selectedWorkspaceId
                      ? workspaceSchedules
                      : scheduleData?.data?.resultList || []
                  }
                  loading={isLoadingSchedules}
                  rowKey="id"
                  pagination={{
                    current: 1,
                    pageSize: 10,
                    total: selectedWorkspaceId
                      ? workspaceSchedules.length
                      : scheduleData?.data?.totalCount || 0,
                    showSizeChanger: false,
                  }}
                />
                <Modal
                  title="스케줄 거부"
                  open={rejectModalVisible}
                  onOk={confirmRejectSchedule}
                  onCancel={() => {
                    setRejectModalVisible(false);
                    setSelectedSchedule(null);
                    setRejectReason("");
                  }}
                  okText="거부"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                >
                  <p>스케줄을 거부하시겠습니까?</p>
                  <TextArea
                    rows={4}
                    placeholder="거부 사유를 입력하세요 (선택사항)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ marginTop: 16 }}
                  />
                </Modal>
              </>
            ),
          },
        ]}
      />
    </>
  );
};

export default React.memo(WorkspaceList);

