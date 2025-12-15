import { IAffiliation, getAllAffiliations, createAffiliation, updateAffiliation, deleteAffiliation, ICreateAffiliationRequest, IUpdateAffiliationRequest } from "@/client/affiliation";
import DefaultTable from "@/components/shared/ui/default-table";
import DefaultTableBtn from "@/components/shared/ui/default-table-btn";
import { ISO8601DateTime } from "@/types/common";
import { Alert, Button, Popconfirm, message, Modal, Form, Input } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useState } from "react";

const AffiliationList = () => {
  const [data, setData] = useState<IAffiliation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAffiliation, setEditingAffiliation] = useState<IAffiliation | null>(null);
  const [form] = Form.useForm<ICreateAffiliationRequest | IUpdateAffiliationRequest>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 소속 목록 조회
  const fetchAffiliations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAllAffiliations();
      setData(response.data.data || []);
    } catch (err: any) {
      setError(err);
      const errorMessage = err?.response?.data?.message || "소속 목록을 불러오는 중 오류가 발생했습니다.";
      messageApi.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchAffiliations();
  }, [fetchAffiliations]);

  const handleOpenModal = useCallback((affiliation?: IAffiliation) => {
    if (affiliation) {
      setEditingAffiliation(affiliation);
      form.setFieldsValue({
        code: affiliation.code,
        name: affiliation.name,
        description: affiliation.description || "",
      });
    } else {
      setEditingAffiliation(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  }, [form]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingAffiliation(null);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async (values: ICreateAffiliationRequest | IUpdateAffiliationRequest) => {
    try {
      setIsSubmitting(true);
      if (editingAffiliation) {
        await updateAffiliation(editingAffiliation.id, values as IUpdateAffiliationRequest);
        messageApi.success("소속이 수정되었습니다.");
      } else {
        await createAffiliation(values as ICreateAffiliationRequest);
        messageApi.success("소속이 등록되었습니다.");
      }
      handleCloseModal();
      await fetchAffiliations();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || (editingAffiliation ? "소속 수정 중 오류가 발생했습니다." : "소속 등록 중 오류가 발생했습니다.");
      messageApi.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingAffiliation, messageApi, handleCloseModal, fetchAffiliations]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteAffiliation(id);
        messageApi.success("소속이 삭제되었습니다.");
        await fetchAffiliations();
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || "소속 삭제 중 오류가 발생했습니다.";
        messageApi.error(errorMessage);
      }
    },
    [messageApi, fetchAffiliations]
  );

  const columns: ColumnsType<IAffiliation> = [
    {
      key: "action",
      width: 150,
      align: "center",
      render: (_value: unknown, record: IAffiliation) => {
        return (
          <span className="flex justify-center gap-2">
            <a
              className="px-2 py-1 text-sm btn"
              onClick={() => handleOpenModal(record)}
            >
              수정
            </a>
            <Popconfirm
              title="소속을 삭제하시겠습니까?"
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
      title: "소속 번호",
      dataIndex: "code",
      width: 120,
      align: "center",
    },
    {
      title: "소속 이름",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "설명",
      dataIndex: "description",
      render: (value: string | null | undefined) => {
        return value || <span className="text-gray-400">-</span>;
      },
    },
    {
      title: "생성일시",
      dataIndex: "createdAt",
      align: "center",
      width: 180,
      render: (value: ISO8601DateTime) => {
        return (
          <div className="text-sm">
            <span className="block">{dayjs(value).format("YYYY/MM/DD")}</span>
            <span className="block">{dayjs(value).format("HH:mm")}</span>
          </div>
        );
      },
    },
    {
      title: "수정일시",
      dataIndex: "updatedAt",
      align: "center",
      width: 180,
      render: (value: ISO8601DateTime) => {
        return (
          <div className="text-sm">
            <span className="block">{dayjs(value).format("YYYY/MM/DD")}</span>
            <span className="block">{dayjs(value).format("HH:mm")}</span>
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
      <DefaultTableBtn className="justify-end">
        <Button type="primary" onClick={() => handleOpenModal()}>
          소속 등록
        </Button>
      </DefaultTableBtn>

      <DefaultTable<IAffiliation>
        columns={columns}
        dataSource={data}
        loading={isLoading}
        className="mt-3"
        countLabel={data.length}
      />

      <Modal
        title={editingAffiliation ? "소속 수정" : "소속 등록"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="소속 번호"
            name="code"
            rules={[
              { required: true, message: "소속 번호를 입력해주세요" },
              { pattern: /^[0-9]{6}$/, message: "소속 번호는 6자리 숫자여야 합니다" },
            ]}
          >
            <Input 
              placeholder="소속 번호를 입력하세요 (6자리 숫자)" 
              maxLength={6}
              disabled={!!editingAffiliation}
            />
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
              onClick={handleCloseModal}
              style={{ marginRight: 8 }}
            >
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {editingAffiliation ? "수정" : "등록"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default React.memo(AffiliationList);

