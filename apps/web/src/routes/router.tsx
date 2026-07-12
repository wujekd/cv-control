import { Navigate, createBrowserRouter, createHashRouter } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ApplicationsView } from "../views/ApplicationsView/ApplicationsView";
import { CvListView } from "../views/CvListView/CvListView";
import { EditorView } from "../views/EditorView/EditorView";
import { ProfileView } from "../views/ProfileView/ProfileView";

function RouteError() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Something broke.</h1>
      <p>The route failed to render.</p>
    </div>
  );
}

// Electron loads the app from file://, where browser-history routing breaks on
// reload; hash routing sidesteps that. The preload-injected API URL doubles as
// the "running inside Electron" signal.
const createRouter = window.__CV_CONTROL_API_URL__ ? createHashRouter : createBrowserRouter;

export const router = createRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <Navigate to="/profile" replace />
      },
      {
        path: "profile",
        element: <ProfileView />
      },
      {
        path: "cvs",
        element: <CvListView />
      },
      {
        path: "cvs/:versionId",
        element: <EditorView />
      },
      {
        path: "applications",
        element: <ApplicationsView />
      }
    ]
  }
]);
