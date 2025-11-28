import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import WorkspaceList from "@/components/page/workspace/workspace-list";

const pageHeader: IPageHeader = {
  title: "근무지 목록",
};

const WorkspaceListPage: IDefaultLayoutPage = () => {
  return (
    <>

      <WorkspaceList />
    </>
  );
};

WorkspaceListPage.getLayout = getDefaultLayout;
WorkspaceListPage.pageHeader = pageHeader;

export default WorkspaceListPage;

