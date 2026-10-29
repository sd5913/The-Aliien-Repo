// Application route definitions. / 应用页面的路由定义。
import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../features/home/HomePage";
import { CreatePollPage } from "../features/polls/create/CreatePollPage";
import { MyPollsPage, PollManagementPage } from "../features/polls/management/ManagementPages";
import { ResultsPage } from "../features/polls/results/ResultsPage";
import { VotingPage } from "../features/polls/voting/VotingPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/polls/new", element: <CreatePollPage /> },
  { path: "/polls", element: <MyPollsPage /> },
  { path: "/polls/:pollId/vote", element: <VotingPage /> },
  { path: "/polls/:pollId/results", element: <ResultsPage /> },
  { path: "/polls/:pollId/manage", element: <PollManagementPage /> },
]);
