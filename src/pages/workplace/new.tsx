import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import WorkspaceForm from "@/components/page/workspace/workspace-form";

const pageHeader: IPageHeader = {
  title: "근무지 등록",
};

const WorkspaceNewPage: IDefaultLayoutPage = () => {
  return <WorkspaceForm />;
};

WorkspaceNewPage.getLayout = getDefaultLayout;
WorkspaceNewPage.pageHeader = pageHeader;

export default WorkspaceNewPage;

