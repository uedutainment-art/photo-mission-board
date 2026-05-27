import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { EventBoard } from "./pages/EventBoard";
import { EventCreate } from "./pages/EventCreate";
import { EventExport } from "./pages/EventExport";
import { EventOverview } from "./pages/EventOverview";
import { EventReview } from "./pages/EventReview";
import { EventTeams } from "./pages/EventTeams";
import { Events } from "./pages/Events";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import { PublicBoard } from "./pages/PublicBoard";
import { ShareEvent } from "./pages/ShareEvent";
import { TeamEntry } from "./pages/TeamEntry";
import { TeamPlaceDetail } from "./pages/TeamPlaceDetail";
import { TeamPlaces } from "./pages/TeamPlaces";
import { TeamQRDetail } from "./pages/TeamQRDetail";
import { TeamSelfie } from "./pages/TeamSelfie";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/events"
        element={
          <RequireAuth>
            <Events />
          </RequireAuth>
        }
      />
      <Route
        path="/events/new"
        element={
          <RequireAuth>
            <EventCreate />
          </RequireAuth>
        }
      />
      <Route
        path="/events/:eventId"
        element={
          <RequireAuth>
            <EventOverview />
          </RequireAuth>
        }
      />
      <Route
        path="/events/:eventId/teams"
        element={
          <RequireAuth>
            <EventTeams />
          </RequireAuth>
        }
      />
      <Route
        path="/events/:eventId/teams/:teamId"
        element={
          <RequireAuth>
            <TeamQRDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/events/:eventId/board"
        element={
          <RequireAuth>
            <EventBoard />
          </RequireAuth>
        }
      />
      <Route
        path="/events/:eventId/review"
        element={
          <RequireAuth>
            <EventReview />
          </RequireAuth>
        }
      />
      <Route
        path="/events/:eventId/export"
        element={
          <RequireAuth>
            <EventExport />
          </RequireAuth>
        }
      />
      <Route path="/events/:eventId/public" element={<PublicBoard />} />
      <Route path="/t/:teamToken" element={<TeamEntry />} />
      <Route path="/t/:teamToken/selfie" element={<TeamSelfie />} />
      <Route path="/t/:teamToken/places" element={<TeamPlaces />} />
      <Route path="/t/:teamToken/places/:placeId" element={<TeamPlaceDetail />} />
      <Route path="/share/:eventId" element={<ShareEvent />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
