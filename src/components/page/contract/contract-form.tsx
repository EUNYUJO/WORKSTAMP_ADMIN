import {
  createContract,
  IContract,
  ICreateContractRequest,
  IUpdateContractRequest,
  updateContract,
} from "@/client/contract";
import DefaultForm from "@/components/shared/form/ui/default-form";
import FormGroup from "@/components/shared/form/ui/form-group";
import FormSection from "@/components/shared/form/ui/form-section";
import { decryptAES, encryptAES } from "@/lib/crypto";
import { Button, Form, Input, message } from "antd";
import { useForm } from "antd/lib/form/Form";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

interface IContractFormValue {
  affiliationCode: string;
  contractorCode: string;
  region: string;
  deliveryAppId: string;
  name: string;
  phoneNumber: string;
  vehicleNumber: string;
}

interface IContractFormProps {
  id?: string;
  initialValues?: Partial<IContractFormValue>;
}

const ContractForm = ({ id, initialValues }: IContractFormProps) => {
  const [form] = useForm<IContractFormValue>();
  const [isLoading, setIsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  // initialValues가 변경될 때 form 업데이트
  useEffect(() => {
    if (initialValues) {
      // 전화번호가 암호화되어 있으면 복호화
      const formValues = { ...initialValues };
      if (formValues.phoneNumber && formValues.phoneNumber.includes("==")) {
        try {
          formValues.phoneNumber = decryptAES(formValues.phoneNumber);
        } catch (e) {
          console.error("전화번호 복호화 실패:", e);
        }
      }
      // 하이픈 제거
      if (formValues.phoneNumber) {
        formValues.phoneNumber = formValues.phoneNumber.replace(/-/g, "");
      }
      form.setFieldsValue(formValues);
    }
  }, [initialValues, form]);

  const handleFinish = async (formValue: IContractFormValue) => {
    try {
      setIsLoading(true);

      // 전화번호에서 하이픈 제거 후 암호화
      const phoneNumberWithoutHyphen = formValue.phoneNumber.replace(/-/g, "");
      const encryptedPhoneNumber = encryptAES(phoneNumberWithoutHyphen);

      if (id) {
        // 수정
        const request: IUpdateContractRequest = {
          affiliationCode: formValue.affiliationCode,
          contractorCode: formValue.contractorCode,
          region: formValue.region,
          deliveryAppId: formValue.deliveryAppId,
          name: formValue.name,
          phoneNumber: encryptedPhoneNumber,
          vehicleNumber: formValue.vehicleNumber,
        };
        await updateContract(Number(id), request);
        messageApi.success("계약서가 수정되었습니다");
      } else {
        // 생성
        const request: ICreateContractRequest = {
          affiliationCode: formValue.affiliationCode,
          contractorCode: formValue.contractorCode,
          region: formValue.region,
          deliveryAppId: formValue.deliveryAppId,
          name: formValue.name,
          phoneNumber: encryptedPhoneNumber,
          vehicleNumber: formValue.vehicleNumber,
        };
        await createContract(request);
        messageApi.success("계약서가 등록되었습니다");
      }

      // 성공 후 목록 페이지로 이동
      setTimeout(() => {
        router.push("/contract/list");
      }, 1000);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || "에러가 발생했습니다";
      messageApi.error(errorMessage);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <>
      {contextHolder}
      <DefaultForm<IContractFormValue> form={form} onFinish={handleFinish}>
        <FormSection title="기본정보" description="계약서 기본 정보를 입력해주세요">
          <FormGroup title="소속코드*">
            <Form.Item
              name="affiliationCode"
              rules={[
                { required: true, message: "소속코드를 입력해주세요" },
                { pattern: /^[0-9]{6}$/, message: "소속코드는 6자리 숫자여야 합니다" },
              ]}
            >
              <Input placeholder="소속코드를 입력하세요 (6자리 숫자)" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="계약자코드*">
            <Form.Item
              name="contractorCode"
              rules={[
                { required: true, message: "계약자코드를 입력해주세요" },
                { max: 50, message: "계약자코드는 50자 이하여야 합니다" },
              ]}
            >
              <Input placeholder="계약자코드를 입력하세요" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="지역*">
            <Form.Item
              name="region"
              rules={[
                { required: true, message: "지역을 입력해주세요" },
                { max: 100, message: "지역은 100자 이하여야 합니다" },
              ]}
            >
              <Input placeholder="지역을 입력하세요" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="배송앱ID*">
            <Form.Item
              name="deliveryAppId"
              rules={[
                { required: true, message: "배송앱ID를 입력해주세요" },
                { max: 100, message: "배송앱ID는 100자 이하여야 합니다" },
              ]}
            >
              <Input placeholder="배송앱ID를 입력하세요" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="이름*">
            <Form.Item
              name="name"
              rules={[
                { required: true, message: "이름을 입력해주세요" },
                { max: 100, message: "이름은 100자 이하여야 합니다" },
              ]}
            >
              <Input placeholder="이름을 입력하세요" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="전화번호*">
            <Form.Item
              name="phoneNumber"
              normalize={(value) => value?.replace(/-/g, "") || ""}
              rules={[
                { required: true, message: "전화번호를 입력해주세요" },
                { pattern: /^[0-9]+$/, message: "숫자만 입력해주세요 (하이픈 제외)" },
              ]}
            >
              <Input placeholder="전화번호를 입력하세요 (예: 01012345678)" />
            </Form.Item>
          </FormGroup>

          <FormGroup title="차량번호*">
            <Form.Item
              name="vehicleNumber"
              rules={[
                { required: true, message: "차량번호를 입력해주세요" },
                { max: 20, message: "차량번호는 20자 이하여야 합니다" },
              ]}
            >
              <Input placeholder="차량번호를 입력하세요" />
            </Form.Item>
          </FormGroup>
        </FormSection>

        <div className="text-center">
          <Button htmlType="submit" type="primary" loading={isLoading}>
            저장
          </Button>
        </div>
      </DefaultForm>
    </>
  );
};

export default React.memo(ContractForm);

