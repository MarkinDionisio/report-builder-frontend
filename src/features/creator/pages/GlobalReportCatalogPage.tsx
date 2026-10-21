import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";
import { GlobalReportCatalog } from "../components/GlobalReportCatalog";

export function GlobalReportCatalogPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  if (!organizationId) return <Navigate to="/creator" replace/>;
  return <div className="global-report-catalog-page">
    <Navbar/>
    <main className="global-report-catalog-main">
      <GlobalReportCatalog key={organizationId} organizationId={organizationId}
        onClose={() => navigate(`/organizations/${organizationId}/creator`)}
        onImported={report => navigate(`/organizations/${organizationId}/creator/reports/${report.id}`)}/>
    </main>
  </div>;
}
