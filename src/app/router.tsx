// Application route definitions. / 应用页面的路由定义。
import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../features/home/pages/HomePage";
import { CreatePollPage } from "../features/polls/pages/CreatePollPage";
import { MyPollsPage, PollManagementPage } from "../features/polls/pages/ManagementPages";
import { ResultsPage } from "../features/polls/pages/ResultsPage";
import { VotingPage } from "../features/polls/pages/VotingPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/polls/new", element: <CreatePollPage /> },
  { path: "/polls", element: <MyPollsPage /> },
  { path: "/polls/:pollId/vote", element: <VotingPage /> },
  { path: "/polls/:pollId/results", element: <ResultsPage /> },
  { path: "/polls/:pollId/manage", element: <PollManagementPage /> },
]);
