import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";
import { GlobalReportCatalog } from "../components/GlobalReportCatalog";

export function GlobalReportCatalogPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  if (!organizationId) return <Navigate to="/creator" replace/>;
  return <div style={{ minHeight: "100vh" }}>
    <Navbar/>
    <main style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1.5rem" }}>
      <GlobalReportCatalog key={organizationId} organizationId={organizationId}
        onClose={() => navigate(`/organizations/${organizationId}/creator`)}
        onImported={report => navigate(`/organizations/${organizationId}/creator/reports/${report.id}`)}/>
    </main>
  </div>;
}
