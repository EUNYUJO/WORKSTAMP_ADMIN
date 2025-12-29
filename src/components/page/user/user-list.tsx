import { IUser, IUsersResponse, getUsers, getUserAttendanceHistory, IAttendanceResponse, IBreakTimeResponse, exportAttendanceHistory, getPendingUsers, approveUser, rejectUser } from "@/client/user";
import { IAffiliation, getAllAffiliations } from "@/client/affiliation";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Dropdown, Input, MenuProps, message, Modal, Select, Table, Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAllWorkspaces, IWorkspace } from "@/client/workspace";
import { hmacSha256Hex } from "@/lib/crypto";

const UserList = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [data, setData] = useState<IUsersResponse | null>(null);
  const [pendingData, setPendingData] = useState<IUsersResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [affiliations, setAffiliations] = useState<IAffiliation[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  // 승인 대기 관련 상태
  const [searchName, setSearchName] = useState("");
  const [searchPhoneNumber, setSearchPhoneNumber] = useState("");

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
    if (activeTab === "users") {
      fetchUsers(selectedWorkspaceId);
    } else if (activeTab === "pending") {
      fetchPendingUsers();
    }
  }, [fetchUsers, selectedWorkspaceId, activeTab]);

  // 승인 대기 사용자 목록 가져오기
  const fetchPendingUsers = useCallback(
    async (name?: string, phoneNumberHash?: string) => {
      try {
        setIsLoadingPending(true);
        setError(null);
        const response = await getPendingUsers({ name, phoneNumberHash });
        setPendingData(response.data);
      } catch (err: any) {
        setError(err);
        const errorMessage = err?.response?.data?.message || "승인 대기 사용자 목록을 불러오는 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      } finally {
        setIsLoadingPending(false);
      }
    },
    [messageApi]
  );

  // 승인 대기 검색 실행
  const handlePendingSearch = useCallback(() => {
    // 전화번호 평문을 해시로 변환
    let phoneNumberHash: string | undefined = undefined;
    if (searchPhoneNumber.trim()) {
      try {
        // 전화번호에서 하이픈과 공백 제거
        const cleanPhoneNumber = searchPhoneNumber.trim().replace(/[-\s]/g, '');
        // HMAC-SHA256 해시 생성
        phoneNumberHash = hmacSha256Hex(cleanPhoneNumber);
      } catch (error) {
        messageApi.error("전화번호 해시 변환 중 오류가 발생했습니다.");
        return;
      }
    }

    fetchPendingUsers(
      searchName.trim() || undefined,
      phoneNumberHash
    );
  }, [fetchPendingUsers, searchName, searchPhoneNumber, messageApi]);

  // 승인 처리
  const handleApprove = useCallback(
    async (userId: number) => {
      Modal.confirm({
        title: "사용자 승인",
        content: "이 사용자를 승인하시겠습니까?",
        onOk: async () => {
          try {
            await approveUser(userId);
            messageApi.success("사용자가 승인되었습니다.");

            // 전화번호 해시 변환
            let phoneNumberHash: string | undefined = undefined;
            if (searchPhoneNumber.trim()) {
              try {
                const cleanPhoneNumber = searchPhoneNumber.trim().replace(/[-\s]/g, '');
                phoneNumberHash = hmacSha256Hex(cleanPhoneNumber);
              } catch (error) {
                // 해시 변환 실패 시 해시 없이 검색
              }
            }

            fetchPendingUsers(searchName.trim() || undefined, phoneNumberHash);
            // 근로자 목록도 새로고침
            fetchUsers(selectedWorkspaceId);
          } catch (err: any) {
            const errorMessage = err?.response?.data?.message || "승인 처리 중 오류가 발생했습니다.";
            messageApi.error(errorMessage);
          }
        },
      });
    },
    [messageApi, fetchPendingUsers, searchName, searchPhoneNumber, fetchUsers, selectedWorkspaceId]
  );

  // 거부 처리
  const handleReject = useCallback(
    async (userId: number) => {
      Modal.confirm({
        title: "사용자 거부",
        content: "이 사용자를 거부하시겠습니까?",
        okText: "거부",
        cancelText: "취소",
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await rejectUser(userId);
            messageApi.success("사용자가 거부되었습니다.");

            // 전화번호 해시 변환
            let phoneNumberHash: string | undefined = undefined;
            if (searchPhoneNumber.trim()) {
              try {
                const cleanPhoneNumber = searchPhoneNumber.trim().replace(/[-\s]/g, '');
                phoneNumberHash = hmacSha256Hex(cleanPhoneNumber);
              } catch (error) {
                // 해시 변환 실패 시 해시 없이 검색
              }
            }

            fetchPendingUsers(searchName.trim() || undefined, phoneNumberHash);
          } catch (err: any) {
            const errorMessage = err?.response?.data?.message || "거부 처리 중 오류가 발생했습니다.";
            messageApi.error(errorMessage);
          }
        },
      });
    },
    [messageApi, fetchPendingUsers, searchName, searchPhoneNumber]
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

  // 승인 대기 테이블 컬럼
  const pendingColumns: ColumnsType<IUser> = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        width: 80,
        sorter: (a, b) => a.id - b.id,
      },
      {
        title: "이름",
        dataIndex: "name",
        key: "name",
        width: 120,
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: "이메일",
        dataIndex: "email",
        key: "email",
        width: 200,
      },
      {
        title: "닉네임",
        dataIndex: "username",
        key: "username",
        width: 150,
      },
      {
        title: "전화번호",
        dataIndex: "phoneNumber",
        key: "phoneNumber",
        width: 150,
        render: (phoneNumber: string) => phoneNumber || "-",
      },
      {
        title: "가입일",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 180,
        render: (date: ISO8601DateTime) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
        sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      },
      {
        title: "상태",
        dataIndex: "status",
        key: "status",
        width: 100,
        render: (status: string) => {
          const statusMap: Record<string, { text: string; color: string }> = {
            PENDING: { text: "대기", color: "orange" },
            APPROVED: { text: "승인", color: "green" },
            REJECTED: { text: "거부", color: "red" },
          };
          const statusInfo = statusMap[status] || { text: status, color: "default" };
          return <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>;
        },
      },
      {
        title: "작업",
        key: "action",
        width: 200,
        fixed: "right" as const,
        render: (_: any, record: IUser) => (
          <div className="flex gap-2">
            <Button
              type="primary"
              size="small"
              onClick={() => handleApprove(record.id)}
            >
              승인
            </Button>
            <Button
              type="default"
              danger
              size="small"
              onClick={() => handleReject(record.id)}
            >
              거부
            </Button>
          </div>
        ),
      },
    ],
    [handleApprove, handleReject]
  );

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
            key: "users",
            label: "근로자 목록",
            children: (
              <>
                <DefaultTableBtn className="justify-between">
                  <div>


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
              </>
            ),
          },
          {
            key: "pending",
            label: "회원가입 승인",
            children: (
              <>
                {/* 검색 영역 */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">이름</label>
                      <Input
                        placeholder="이름으로 검색"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        onPressEnter={handlePendingSearch}
                        allowClear
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">전화번호</label>
                      <Input
                        placeholder="전화번호를 입력하세요 (예: 01012345678)"
                        value={searchPhoneNumber}
                        onChange={(e) => {
                          // 숫자와 하이픈만 허용
                          const cleaned = e.target.value.replace(/[^0-9-]/g, '');
                          setSearchPhoneNumber(cleaned);
                        }}
                        onPressEnter={handlePendingSearch}
                        allowClear
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="primary" onClick={handlePendingSearch} className="w-full">
                        검색
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 테이블 */}
                <DefaultTable
                  columns={pendingColumns}
                  dataSource={pendingData?.data || []}
                  loading={isLoadingPending}
                  rowKey="id"
                  scroll={{ x: 1200 }}
                />
              </>
            ),
          },
        ]}
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
                  ENTRY: "입차",
                  OFF: "미입차",
                };
                return waveMap[wave] || wave;
              },
            },
            {
              title: "휴식시간",
              dataIndex: "breakTimes",
              width: 200,
              render: (breakTimes: IBreakTimeResponse[]) => {
                if (!breakTimes || breakTimes.length === 0) {
                  return "-";
                }
                return (
                  <div style={{ fontSize: "12px" }}>
                    {breakTimes.map((breakTime, index) => (
                      <div key={breakTime.id} style={{ marginBottom: index < breakTimes.length - 1 ? "4px" : 0 }}>
                        {dayjs(breakTime.startTime).format("HH:mm")}
                        {breakTime.endTime ? ` - ${dayjs(breakTime.endTime).format("HH:mm")}` : " (진행중)"}
                      </div>
                    ))}
                  </div>
                );
              },
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

