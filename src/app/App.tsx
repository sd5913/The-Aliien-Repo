// Root component that mounts the application router. / 挂载应用路由的根组件。
import { RouterProvider } from "react-router-dom";
import { ShareProvider } from "../features/polls/components/ShareProvider";
import { router } from "./router";

export function App() {
  return <ShareProvider><RouterProvider router={router} /></ShareProvider>;
}
