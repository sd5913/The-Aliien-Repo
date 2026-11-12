// Application route definitions. / 应用页面的路由定义。
import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../features/home/pages/HomePage";
import { CreatePollPage } from "../features/polls/pages/CreatePollPage";
import { MyPollsPage } from "../features/polls/pages/MyPollsPage";
import { ResultsPage } from "../features/polls/pages/ResultsPage";
import { VotingPage } from "../features/polls/pages/VotingPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/my", element: <MyPollsPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/create", element: <CreatePollPage /> },
  { path: "/poll/:id", element: <VotingPage /> },
  { path: "/poll/:id/results", element: <ResultsPage /> },
]);
