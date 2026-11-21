// Application route definitions.
import { createBrowserRouter, redirect } from "react-router-dom";
import { HomePage } from "../features/home/pages/HomePage";
import { CreatePollPage } from "../features/polls/pages/CreatePollPage";
import { ResultsPage } from "../features/polls/pages/ResultsPage";
import { VotingPage } from "../features/polls/pages/VotingPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { SettingsPreferencesPage } from "../features/settings/pages/SettingsPreferencesPage";
import { EditProfilePage } from "../features/settings/pages/EditProfilePage";
import { AuthPage } from "../features/auth/pages/AuthPage";


import { ParticipantLoginPage } from "../features/auth/pages/ParticipantLoginPage";
import { RequireAccount } from "../features/auth/components/AccountProvider";

export const router = createBrowserRouter([
  { path: "/auth", element: <AuthPage /> },
  { path: "/login", element: <AuthPage /> },
  { path: "/", element: <HomePage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/profile", loader: () => redirect("/settings") },
  { path: "/settings/preferences", element: <SettingsPreferencesPage /> },
  { path: "/edit-profile", element: <EditProfilePage /> },
  { path: "/create", element: <RequireAccount><CreatePollPage /></RequireAccount> },
  { path: "/join", element: <ParticipantLoginPage /> },
  { path: "/poll/:id/join", element: <ParticipantLoginPage /> },
  { path: "/poll/:id", element: <VotingPage /> },
  { path: "/poll/:id/manage", loader: ({ params }) => redirect(`/poll/${encodeURIComponent(params.id ?? "")}/results`) },
  { path: "/poll/:id/results", element: <ResultsPage /> },
  { path: "/poll/:id/share", loader: ({ params }) => redirect(`/poll/${encodeURIComponent(params.id ?? "")}/results?share=1`) },
]);
