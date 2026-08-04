import { useParams } from "react-router-dom";
import { useWorkspace } from "../hooks/useWorkspaces";
import { useProjects } from "../hooks/useProjects";
import { AppHeader } from "../components/AppHeader";
import { Breadcrumbs } from "../components/Breadcrumbs";

export default function ProjectBoard() {
  const { workspaceId = "", projectId = "" } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const workspaceQuery = useWorkspace(workspaceId);
  const projectsQuery = useProjects(workspaceId);

  const workspaceName = workspaceQuery.data?.name ?? "Workspace";
  const project = projectsQuery.data?.find((p) => p.id === projectId);
  const projectName = project?.name ?? "Project";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <AppHeader>
        <Breadcrumbs
          items={[
            { label: "Workspaces", to: "/app" },
            { label: workspaceName, to: `/app/workspaces/${workspaceId}` },
            { label: projectName },
          ]}
        />
        <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">
          {projectName}
        </h1>
      </AppHeader>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="animate-fade-in-up rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Board coming soon</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            To Do / In Progress / Done columns land in the next increment. The tasks API behind
            this board is already built.
          </p>
        </div>
      </main>
    </div>
  );
}
