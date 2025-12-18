import { NextPageContext } from "next";
import { Alert, Button } from "antd";
import { useRouter } from "next/router";

interface ErrorProps {
    statusCode?: number;
    message?: string;
}

function Error({ statusCode, message }: ErrorProps) {
    const router = useRouter();

    return (
        <div style={{ padding: "50px", textAlign: "center" }}>
            <Alert
                message={statusCode ? `오류 ${statusCode}` : "오류가 발생했습니다"}
                description={
                    <div>
                        <p>{message || "서버에서 오류가 발생했습니다."}</p>
                        {statusCode === 500 && (
                            <p style={{ marginTop: "10px", color: "#666" }}>
                                서버 로그를 확인하거나 관리자에게 문의해주세요.
                            </p>
                        )}
                    </div>
                }
                type="error"
                showIcon
                style={{ marginBottom: "20px" }}
            />
            <Button type="primary" onClick={() => router.push("/")}>
                홈으로 돌아가기
            </Button>
            <Button style={{ marginLeft: "10px" }} onClick={() => router.reload()}>
                새로고침
            </Button>
        </div>
    );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    const message = err?.message || "알 수 없는 오류가 발생했습니다.";
    return { statusCode, message };
};

export default Error;

