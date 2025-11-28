import { createWorkspace, ICreateWorkspaceRequest, IUpdateWorkspaceRequest, updateWorkspace } from "@/client/workspace";
import DefaultForm from "@/components/shared/form/ui/default-form";
import FormGroup from "@/components/shared/form/ui/form-group";
import FormSection from "@/components/shared/form/ui/form-section";
import { Button, Form, Input, message, Modal } from "antd";
import { useForm } from "antd/lib/form/Form";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import DaumPostcode from "react-daum-postcode";

interface IWorkspaceFormValue {
  name: string;
  description?: string;
  postNo: string;
  basicAddr: string;
  addrDetail: string;
}

interface IWorkspaceFormProps {
  id?: string;
  initialValues?: Partial<IWorkspaceFormValue>;
}

const WorkspaceForm = ({ id, initialValues }: IWorkspaceFormProps) => {
  const [form] = useForm<IWorkspaceFormValue>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  // initialValues가 변경될 때 form 업데이트
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  const handleFinish = async (formValue: IWorkspaceFormValue) => {
    try {
      setIsLoading(true);

      const request: ICreateWorkspaceRequest | IUpdateWorkspaceRequest = {
        name: formValue.name,
        description: formValue.description,
        postNo: formValue.postNo,
        basicAddr: formValue.basicAddr,
        addrDetail: formValue.addrDetail,
      };

      if (id) {
        // 수정
        await updateWorkspace(Number(id), request);
        messageApi.success("근무지가 수정되었습니다");
      } else {
        // 생성
        await createWorkspace(request);
        messageApi.success("근무지가 등록되었습니다");
      }

      // 성공 후 목록 페이지로 이동
      setTimeout(() => {
        router.push("/workplace/list");
      }, 1000);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || "에러가 발생했습니다";
      messageApi.error(errorMessage);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const handlePostcodeComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }
      if (data.buildingName !== "") {
        extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    form.setFieldsValue({
      postNo: data.zonecode,
      basicAddr: fullAddress,
    });
    setIsPostcodeOpen(false);
  };

  return (
    <>
      {contextHolder}
      <DefaultForm<IWorkspaceFormValue> form={form} initialValues={initialValues} onFinish={handleFinish}>
        <FormSection title="기본정보" description="근무지 기본 정보를 입력해주세요">
          <FormGroup title="근무지명*">
            <Form.Item name="name" rules={[{ required: true, message: "근무지명을 입력해주세요" }]}>
              <Input placeholder="근무지명을 입력하세요" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="설명">
            <Form.Item name="description">
              <Input.TextArea rows={4} placeholder="근무지 설명을 입력하세요" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="주소*">
            <Form.Item name="postNo" rules={[{ required: true, message: "우편번호를 입력해주세요" }]}>
              <Input
                placeholder="우편번호"
                readOnly
                addonAfter={
                  <Button type="link" onClick={() => setIsPostcodeOpen(true)}>
                    주소 검색
                  </Button>
                }
                style={{ maxWidth: 300 }}
              />
            </Form.Item>
            <Form.Item name="basicAddr" rules={[{ required: true, message: "기본 주소를 입력해주세요" }]} className="mt-2">
              <Input placeholder="기본 주소" readOnly />
            </Form.Item>
            <Form.Item name="addrDetail" rules={[{ required: true, message: "상세 주소를 입력해주세요" }]} className="mt-2">
              <Input placeholder="상세 주소를 입력하세요" />
            </Form.Item>
          </FormGroup>
        </FormSection>

        <div className="text-center">
          <Button htmlType="submit" type="primary" loading={isLoading}>
            저장
          </Button>
        </div>
      </DefaultForm>

      <Modal
        title="주소 검색"
        open={isPostcodeOpen}
        onCancel={() => setIsPostcodeOpen(false)}
        footer={null}
        width={500}
      >
        <DaumPostcode onComplete={handlePostcodeComplete} />
      </Modal>
    </>
  );
};

export default React.memo(WorkspaceForm);

