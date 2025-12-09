import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import ApprovedScheduleList from "@/components/page/schedule/approved-schedule-list";

const pageHeader: IPageHeader = {
  title: "승인된 스케줄",
};

const ApprovedSchedulePage: IDefaultLayoutPage = () => {
  return (
    <>
      <ApprovedScheduleList />
    </>
  );
};

ApprovedSchedulePage.getLayout = getDefaultLayout;
ApprovedSchedulePage.pageHeader = pageHeader;

export default ApprovedSchedulePage;

