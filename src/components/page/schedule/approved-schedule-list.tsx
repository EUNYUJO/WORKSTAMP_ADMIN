import {
    IWorkSchedule,
    IAllSchedulesResponse,
    getAllSchedulesByWorkspace,
} from "@/client/schedule";
import { IWorkspace, getAllWorkspaces } from "@/client/workspace";
import { IUser, getUsers } from "@/client/user";
import DefaultTable from "@/components/shared/ui/default-table";
import { Alert, Select, Tag, message } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const { Option } = Select;

const ApprovedScheduleList = () => {
    const [schedules, setSchedules] = useState<IWorkSchedule[]>([]);
    const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
    const [users, setUsers] = useState<IUser[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [messageApi, contextHolder] = message.useMessage();

    // 근무지 목록 조회
    const fetchWorkspaces = useCallback(async () => {
        try {
            const response = await getAllWorkspaces();
            setWorkspaces(response.data.data || []);
        } catch (err) {
            console.error("근무지 목록 조회 실패:", err);
        }
    }, []);

    // 사용자 목록 조회
    const fetchUsers = useCallback(async () => {
        try {
            const response = await getUsers();
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

    // 근무지 ID로 근무지 이름 찾기
    const getWorkspaceName = useCallback(
        (workspaceId: number) => {
            const workspace = workspaces.find((ws) => ws.id === workspaceId);
            return workspace?.name || workspaceId.toString();
        },
        [workspaces]
    );

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

    // 승인된 스케줄 조회
    const fetchApprovedSchedules = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (selectedWorkspaceId) {
                // 특정 워크스페이스의 승인된 스케줄만 조회
                const response = await getAllSchedulesByWorkspace(selectedWorkspaceId);
                const approvedSchedules = (response.data?.data || []).filter(
                    (schedule) => schedule.status === "APPROVED"
                );
                setSchedules(approvedSchedules);
            } else {
                // 모든 워크스페이스의 승인된 스케줄 조회
                const allApprovedSchedules: IWorkSchedule[] = [];

                for (const workspace of workspaces) {
                    try {
                        const response = await getAllSchedulesByWorkspace(workspace.id);
                        const approvedSchedules = (response.data?.data || []).filter(
                            (schedule) => schedule.status === "APPROVED"
                        );
                        allApprovedSchedules.push(...approvedSchedules);
                    } catch (err) {
                        console.error(`워크스페이스 ${workspace.id} 스케줄 조회 실패:`, err);
                    }
                }

                // 연도, 주차, 워크스페이스 순으로 정렬
                allApprovedSchedules.sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    if (a.week !== b.week) return b.week - a.week;
                    return a.workspaceId - b.workspaceId;
                });

                setSchedules(allApprovedSchedules);
            }
        } catch (err: any) {
            setError(err);
            const errorMessage =
                err?.response?.data?.message || "승인된 스케줄 목록을 불러오는 중 오류가 발생했습니다.";
            messageApi.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [selectedWorkspaceId, workspaces, messageApi]);

    useEffect(() => {
        fetchWorkspaces();
        fetchUsers();
    }, [fetchWorkspaces, fetchUsers]);

    useEffect(() => {
        if (workspaces.length > 0) {
            fetchApprovedSchedules();
        }
    }, [fetchApprovedSchedules, workspaces.length, selectedWorkspaceId]);

    const handleWorkspaceChange = useCallback(
        (workspaceId: number | null) => {
            setSelectedWorkspaceId(workspaceId);
        },
        []
    );

    const columns: ColumnsType<IWorkSchedule> = [
        {
            key: "id",
            title: "ID",
            dataIndex: "id",
            width: 80,
        },
        {
            key: "workspaceId",
            title: "근무지",
            dataIndex: "workspaceId",
            width: 150,
            render: (workspaceId: number) => getWorkspaceName(workspaceId),
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
            key: "approvedAt",
            title: "승인일시",
            dataIndex: "approvedAt",
            width: 180,
            render: (date: string | null) =>
                date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : "-",
        },
        {
            key: "createdAt",
            title: "신청일시",
            dataIndex: "createdAt",
            width: 180,
            render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
        },
    ];

    return (
        <>
            {contextHolder}
            <div style={{ marginBottom: 16 }}>
                <Select
                    placeholder="근무지 선택 (전체)"
                    allowClear
                    style={{ width: 300 }}
                    onChange={handleWorkspaceChange}
                    value={selectedWorkspaceId}
                >
                    {workspaces.map((workspace) => (
                        <Option key={workspace.id} value={workspace.id}>
                            {workspace.name}
                        </Option>
                    ))}
                </Select>
            </div>
            {error && (
                <Alert
                    message="오류"
                    description={error.message}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setError(null)}
                    style={{ marginBottom: 16 }}
                />
            )}
            <DefaultTable
                columns={columns}
                dataSource={schedules}
                loading={isLoading}
                rowKey="id"
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `총 ${total}개`,
                }}
            />
        </>
    );
};

export default ApprovedScheduleList;

