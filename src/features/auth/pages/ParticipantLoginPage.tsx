import { Navigate, useLocation, useParams } from "react-router-dom";

// Preserve existing shared /join links without creating a guest identity.
export function ParticipantLoginPage() {
  const { id } = useParams();
  const location = useLocation();
  return <Navigate replace to={id ? "/poll/" + encodeURIComponent(id) + location.search + location.hash : "/auth"} />;
}
