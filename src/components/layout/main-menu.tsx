import { Divider } from "antd";
import { Home, Monitor, Package2 } from "lucide-react";
import React from "react";
import Menu, { IMenu } from "./nav";

const mainMenuData: IMenu[] = [
  {
    id: "home",
    name: "홈",
    icon: <Home className="w-5 h-5" />,
    link: {
      path: "/",
    },
  },
  {
    id: "workplace",
    name: "근무지 관리",
    icon: <Package2 className="w-5 h-5" />,
    submenu: [
      {
        id: "workplaceList",
        name: "근무지 목록",
        link: {
          path: "/workplace/list",
        },
      },
    ],
  },
  {
    id: "worker",
    name: "근로자 관리  ",
    icon: <Package2 className="w-5 h-5" />,
    submenu: [
      {
        id: "workerList",
        name: "근로자 목록",
        link: {
          path: "/worker/list",
        },
      },
    ],
  },
];

const devMenuData: IMenu[] = [
  {
    id: "dev",
    name: "사용 가이드",
    icon: <Monitor className="w-5 h-5" />,
    submenu: [
      {
        name: "폼",
        link: {
          path: "/sample/form",
        },
      },
    ],
  },
];

const MainMenu = () => {
  return (
    <>
      <>
        <Divider orientation="left" plain>
          메인
        </Divider>

        <Menu data={mainMenuData} />
      </>
      <>
        <Divider orientation="left" plain>
          개발
        </Divider>

        <Menu data={devMenuData} />
      </>
    </>
  );
};

export default React.memo(MainMenu);
