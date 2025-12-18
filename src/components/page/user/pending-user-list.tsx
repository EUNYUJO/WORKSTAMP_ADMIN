import { IUser, IUsersResponse, getPendingUsers, approveUser, rejectUser } from "@/client/user";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Input, message, Modal, Table } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const { TextArea } = Input;

const PendingUserList = () => {
  const [data, setData] = useState<IUsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  
  // 검색 상태
  const [searchName, setSearchName] = useState("");
  const [searchPhoneNumber, setSearchPhoneNumber] = useState("");
  
  // 거부 사유 모달
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // 승인 대기 사용자 목록 가져오기
  const fetchPendingUsers = useCallback(
    async (name?: string, phoneNumberHash?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getPendingUsers({ name, phoneNumberHash });
        setData(response.data);
      } catch (err: any) {
        setError(err);
        const errorMessage = err?.response?.data?.message || "승인 대기 사용자 목록을 불러오는 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [messageApi]
  );

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // 검색 실행
  const handleSearch = useCallback(() => {
    fetchPendingUsers(
      searchName.trim() || undefined,
      searchPhoneNumber.trim() || undefined
    );
  }, [fetchPendingUsers, searchName, searchPhoneNumber]);

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
            fetchPendingUsers(searchName.trim() || undefined, searchPhoneNumber.trim() || undefined);
          } catch (err: any) {
            const errorMessage = err?.response?.data?.message || "승인 처리 중 오류가 발생했습니다.";
            messageApi.error(errorMessage);
          }
        },
      });
    },
    [messageApi, fetchPendingUsers, searchName, searchPhoneNumber]
  );

  // 거부 처리
  const handleReject = useCallback(
    async () => {
      if (!selectedUserId) return;
      
      try {
        await rejectUser(selectedUserId, rejectReason.trim() || undefined);
        messageApi.success("사용자가 거부되었습니다.");
        setRejectModalVisible(false);
        setRejectReason("");
        setSelectedUserId(null);
        fetchPendingUsers(searchName.trim() || undefined, searchPhoneNumber.trim() || undefined);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || "거부 처리 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      }
    },
    [selectedUserId, rejectReason, messageApi, fetchPendingUsers, searchName, searchPhoneNumber]
  );

  // 거부 모달 열기
  const openRejectModal = useCallback((userId: number) => {
    setSelectedUserId(userId);
    setRejectReason("");
    setRejectModalVisible(true);
  }, []);

  const columns: ColumnsType<IUser> = useMemo(
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
        title: "핸드폰 해시",
        dataIndex: "phoneNumberHash",
        key: "phoneNumberHash",
        width: 200,
        render: (hash: string) => hash ? `${hash.substring(0, 16)}...` : "-",
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
              onClick={() => openRejectModal(record.id)}
            >
              거부
            </Button>
          </div>
        ),
      },
    ],
    [handleApprove, openRejectModal]
  );

  const users = useMemo(() => data?.data || [], [data]);

  return (
    <div className="p-6">
      {contextHolder}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-4">승인 대기 사용자 목록</h2>
        
        {/* 검색 영역 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">이름</label>
              <Input
                placeholder="이름으로 검색"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">핸드폰번호 해시</label>
              <Input
                placeholder="핸드폰번호 해시로 검색"
                value={searchPhoneNumber}
                onChange={(e) => setSearchPhoneNumber(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />
            </div>
            <div className="flex items-end">
              <Button type="primary" onClick={handleSearch} className="w-full">
                검색
              </Button>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <DefaultTable
          columns={columns}
          dataSource={users}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1200 }}
        />
      </div>

      {/* 거부 사유 모달 */}
      <Modal
        title="사용자 거부"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason("");
          setSelectedUserId(null);
        }}
        okText="거부"
        cancelText="취소"
        okButtonProps={{ danger: true }}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">거부 사유 (선택사항)</label>
          <TextArea
            rows={4}
            placeholder="거부 사유를 입력하세요"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default PendingUserList;

