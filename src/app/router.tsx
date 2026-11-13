// Application route definitions. / 应用页面的路由定义。
import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../features/home/pages/HomePage";
import { CreatePollPage } from "../features/polls/pages/CreatePollPage";
import { MyPollsPage } from "../features/polls/pages/MyPollsPage";
import { ResultsPage } from "../features/polls/pages/ResultsPage";
import { PollManagementPage } from "../features/polls/pages/ManagementPages";
import { VotingPage } from "../features/polls/pages/VotingPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { SettingsPreferencesPage } from "../features/settings/pages/SettingsPreferencesPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/my", element: <MyPollsPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/settings/preferences", element: <SettingsPreferencesPage /> },
  { path: "/create", element: <CreatePollPage /> },
  { path: "/poll/:id", element: <VotingPage /> },
  { path: "/poll/:id/manage", element: <PollManagementPage /> },
  { path: "/poll/:id/results", element: <ResultsPage /> },
]);
