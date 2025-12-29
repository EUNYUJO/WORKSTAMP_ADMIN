import {
    IWorkSchedule,
    IPendingSchedulesResponse,
    getPendingSchedules,
    approveSchedule,
    rejectSchedule,
} from "@/client/schedule";
import { IWorkspace, getAllWorkspaces } from "@/client/workspace";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { Alert, Button, Input, Modal, Popconfirm, Tag, message } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const { TextArea } = Input;

const ScheduleList = () => {
    const [data, setData] = useState<IPendingSchedulesResponse | null>(null);
    const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [messageApi, contextHolder] = message.useMessage();
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<IWorkSchedule | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const router = useRouter();

    const currentPage = Number(router.query.page || 1);
    const pageSize = 10;

    // 근무지 목록 조회
    const fetchWorkspaces = useCallback(async () => {
        try {
            // 페이징 없이 모든 근무지 가져오기 (큰 사이즈로)
            const response = await getAllWorkspaces(1, 1000);
            const pagedResponse = response.data;
            setWorkspaces(pagedResponse.data?.resultList || []);
        } catch (err) {
            console.error("근무지 목록 조회 실패:", err);
            setWorkspaces([]);
        }
    }, []);

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
            case "ENTRY":
                return <Tag color="green">입차</Tag>;
            case "OFF":
                return <Tag color="default">미입차</Tag>;
            default:
                return <Tag>{waveType}</Tag>;
        }
    };

    const fetchSchedules = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getPendingSchedules(currentPage, pageSize);
            setData(response.data);
        } catch (err: any) {
            setError(err);
            const errorMessage =
                err?.response?.data?.message || "스케줄 목록을 불러오는 중 오류가 발생했습니다.";
            messageApi.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [messageApi, currentPage, pageSize]);

    useEffect(() => {
        fetchSchedules();
        fetchWorkspaces();
    }, [fetchSchedules, fetchWorkspaces]);

    const handleApprove = useCallback(
        async (schedule: IWorkSchedule) => {
            try {
                await approveSchedule(schedule.id);
                messageApi.success("스케줄이 승인되었습니다.");
                await fetchSchedules();
            } catch (err: any) {
                const errorMessage = err?.response?.data?.message || "스케줄 승인 중 오류가 발생했습니다.";
                messageApi.error(errorMessage);
            }
        },
        [fetchSchedules, messageApi]
    );

    const handleReject = useCallback(
        async (schedule: IWorkSchedule) => {
            setSelectedSchedule(schedule);
            setRejectReason("");
            setRejectModalVisible(true);
        },
        []
    );

    const confirmReject = useCallback(async () => {
        if (!selectedSchedule) return;

        try {
            await rejectSchedule(selectedSchedule.id, rejectReason || undefined);
            messageApi.success("스케줄이 거부되었습니다.");
            setRejectModalVisible(false);
            setSelectedSchedule(null);
            setRejectReason("");
            await fetchSchedules();
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || "스케줄 거부 중 오류가 발생했습니다.";
            messageApi.error(errorMessage);
        }
    }, [selectedSchedule, rejectReason, fetchSchedules, messageApi]);

    const handleChangePage = useCallback(
        (pageNumber: number) => {
            router.push({
                pathname: router.pathname,
                query: { ...router.query, page: pageNumber },
            });
        },
        [router]
    );

    const columns: ColumnsType<IWorkSchedule> = [
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
                        onConfirm={() => handleApprove(record)}
                        okText="승인"
                        cancelText="취소"
                    >
                        <Button type="primary" size="small" style={{ marginRight: 8 }}>
                            승인
                        </Button>
                    </Popconfirm>
                    <Button type="default" size="small" danger onClick={() => handleReject(record)}>
                        거부
                    </Button>
                </DefaultTableBtn>
            ),
        },
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

    return (
        <>
            {contextHolder}
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
                dataSource={data?.data?.resultList || []}
                loading={isLoading}
                rowKey="id"
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: data?.data?.totalCount || 0,
                    onChange: handleChangePage,
                    showSizeChanger: false,
                }}
            />
            <Modal
                title="스케줄 거부"
                open={rejectModalVisible}
                onOk={confirmReject}
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
    );
};

export default ScheduleList;

