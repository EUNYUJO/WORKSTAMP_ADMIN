import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import AffiliationList from "@/components/page/affiliation/affiliation-list";

const pageHeader: IPageHeader = {
  title: "소속 목록",
};

const AffiliationListPage: IDefaultLayoutPage = () => {
  return (
    <>
      <AffiliationList />
    </>
  );
};

AffiliationListPage.getLayout = getDefaultLayout;
AffiliationListPage.pageHeader = pageHeader;

export default AffiliationListPage;

