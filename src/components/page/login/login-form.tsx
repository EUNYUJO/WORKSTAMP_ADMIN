import { Alert, Button, Form, Input } from "antd";
import { useForm } from "antd/lib/form/Form";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useCallback, useState } from "react";

interface ILoginFormValue {
  email: string;
  password: string;
}

const LoginForm = () => {
  const router = useRouter();
  const [form] = useForm<ILoginFormValue>();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleFinish = useCallback(async (value: ILoginFormValue) => {
    setIsLoading(true);

    try {
      const result = await signIn("login-credentials", {
        email: value.email,
        password: value.password,
        redirect: false,
      });

      if (result?.error) {
        console.error("Login error:", result.error);
        router.push(`/login?error=${encodeURIComponent(result.error)}`);
      } else if (result?.ok) {
        router.push("/");
      }
    } catch (error: any) {
      console.error("Login exception:", error);
      router.push(`/login?error=${encodeURIComponent(error.message || "로그인 중 오류가 발생했습니다")}`);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <>
      {router?.query.error && router?.query.error !== "CredentialsSignin" ? (
        <div className="mb-3">
          <Alert message={`로그인 중 오류가 발생했습니다. ${router?.query.error}`} type="warning" />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4">
      </div>
      <Form<ILoginFormValue>
        form={form}
        layout="vertical"
        initialValues={{ email: "", password: "" }}
        onFinish={handleFinish}
      >
        <div className="mb-3">
          {router?.query.error === "CredentialsSignin" ? (
            <>
              <Alert message="로그인을 실패했습니다. 아이디 또는 비밀번호를 다시 확인해주세요." type="error" />
            </>
          ) : (
            <></>
          )}
        </div>
        <Form.Item name="email" rules={[{ required: true, message: "이메일을 입력해주세요" }, { type: "email", message: "올바른 이메일 형식을 입력해주세요" }]}>
          <Input size="large" placeholder="이메일" type="email" />
        </Form.Item>

        <Form.Item name="password" rules={[{ required: true, message: "비밀번호를 입력해주세요" }]}>
          <Input placeholder="비밀번호" type="password" size="large" />
        </Form.Item>

        <Button size="large" type="primary" htmlType="submit" className="w-full bg-hrgroup" loading={isLoading}>
          로그인
        </Button>


      </Form>


    </>
  );
};

export default React.memo(LoginForm);
