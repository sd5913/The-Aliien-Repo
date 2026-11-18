// Root component that mounts the application router. / 挂载应用路由的根组件。
import { RouterProvider } from "react-router-dom";
import { ShareProvider } from "../features/polls/components/ShareProvider";
import { router } from "./router";
import { AccountProvider } from "../features/auth/components/AccountProvider";

export function App() {
  return <AccountProvider><ShareProvider><RouterProvider router={router} /></ShareProvider></AccountProvider>;
}
