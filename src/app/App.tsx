// Root component that mounts the application router. / 挂载应用路由的根组件。
import { LocaleProvider } from "../i18n/LocaleProvider";
import { RouterProvider } from "react-router-dom";
import { ShareProvider } from "../features/polls/components/ShareProvider";
import { router } from "./router";
import { AccountProvider } from "../features/auth/components/AccountProvider";
import { PastePollPrompt } from "../features/polls/components/PastePollPrompt";
import { isIosApp } from "../lib/platform";

const openPastedPoll = (path: string) => { void router.navigate(path); };

export function App() {
  return <LocaleProvider><AccountProvider><ShareProvider>
    <RouterProvider router={router} />
    {isIosApp && <PastePollPrompt openPoll={openPastedPoll} />}
  </ShareProvider></AccountProvider></LocaleProvider>;
}
