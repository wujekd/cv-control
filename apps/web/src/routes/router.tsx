import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { EditorView } from "../views/EditorView/EditorView";

function RouteError() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Something broke.</h1>
      <p>The route failed to render.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <Navigate to="/editor" replace />
      },
      {
        path: "editor/:versionId?",
        element: <EditorView />
      }
    ]
  }
]);

