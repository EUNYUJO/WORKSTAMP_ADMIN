import { getDefaultLayout, IDefaultLayoutPage, IPageHeader } from "@/components/layout/default-layout";
import ScheduleList from "@/components/page/schedule/schedule-list";

const pageHeader: IPageHeader = {
  title: "스케줄 승인",
};

const ScheduleListPage: IDefaultLayoutPage = () => {
  return (
    <>
      <ScheduleList />
    </>
  );
};

ScheduleListPage.getLayout = getDefaultLayout;
ScheduleListPage.pageHeader = pageHeader;

export default ScheduleListPage;

