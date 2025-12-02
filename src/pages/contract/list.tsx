import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import ContractList from "@/components/page/contract/contract-list";

const pageHeader: IPageHeader = {
  title: "계약서 목록",
};

const ContractListPage: IDefaultLayoutPage = () => {
  return (
    <>
      <ContractList />
    </>
  );
};

ContractListPage.getLayout = getDefaultLayout;
ContractListPage.pageHeader = pageHeader;

export default ContractListPage;

