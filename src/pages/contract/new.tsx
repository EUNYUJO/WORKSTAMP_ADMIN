import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import ContractForm from "@/components/page/contract/contract-form";

const pageHeader: IPageHeader = {
  title: "계약서 등록",
};

const ContractNewPage: IDefaultLayoutPage = () => {
  return <ContractForm />;
};

ContractNewPage.getLayout = getDefaultLayout;
ContractNewPage.pageHeader = pageHeader;

export default ContractNewPage;

