import { IWorkspace } from "@/client/workspace";
import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import WorkspaceForm from "@/components/page/workspace/workspace-form";
import { Alert } from "antd";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const pageHeader: IPageHeader = {
  title: "근무지 수정",
};

const WorkspaceEditPage: IDefaultLayoutPage = () => {
  const router = useRouter();
  const [data, setData] = useState<IWorkspace | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // 이미 데이터를 로드했으면 다시 로드하지 않음
    if (hasLoadedRef.current) return;

    // sessionStorage에서 목록에서 저장한 데이터 가져오기
    const storedData = sessionStorage.getItem("workspaceEditData");
    console.log("수정 페이지 - 저장된 데이터 확인:", storedData ? "있음" : "없음", router.query.id);

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData) as IWorkspace;
        console.log("수정 페이지 - 파싱된 데이터:", parsedData);
        // 목록에서 클릭한 해당 아이템의 데이터를 그대로 사용
        setData(parsedData);
        hasLoadedRef.current = true;
        // 사용 후 즉시 삭제
        sessionStorage.removeItem("workspaceEditData");
      } catch (e) {
        console.error("데이터 파싱 오류:", e, storedData);
        setData(null);
        hasLoadedRef.current = true;
      }
    } else {
      // 약간의 지연 후 다시 시도 (router.push와 sessionStorage 저장 사이의 타이밍 이슈 대응)
      const timer = setTimeout(() => {
        const retryData = sessionStorage.getItem("workspaceEditData");
        console.log("재시도 - 저장된 데이터:", retryData ? "있음" : "없음");
        if (retryData) {
          try {
            const parsedData = JSON.parse(retryData) as IWorkspace;
            setData(parsedData);
            hasLoadedRef.current = true;
            sessionStorage.removeItem("workspaceEditData");
          } catch (e) {
            console.error("재시도 데이터 파싱 오류:", e);
            setData(null);
            hasLoadedRef.current = true;
          }
        } else {
          setData(null);
          hasLoadedRef.current = true;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [router.query.id]);

  if (!router.query.id) {
    return <Alert message="근무지 ID가 필요합니다." type="error" className="my-5" />;
  }

  if (!data) {
    return <Alert message="데이터를 찾을 수 없습니다. 목록 페이지에서 수정 버튼을 클릭해주세요." type="warning" className="my-5" />;
  }

  return <WorkspaceForm id={router.query.id as string} initialValues={data} />;
};

WorkspaceEditPage.getLayout = getDefaultLayout;
WorkspaceEditPage.pageHeader = pageHeader;

export default WorkspaceEditPage;

