import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import PendingUserList from "@/components/page/user/pending-user-list";

const pageHeader: IPageHeader = {
  title: "승인 대기 사용자",
};

const PendingUserPage: IDefaultLayoutPage = () => {
  return (
    <>
      <PendingUserList />
    </>
  );
};

PendingUserPage.getLayout = getDefaultLayout;
PendingUserPage.pageHeader = pageHeader;

export default PendingUserPage;

