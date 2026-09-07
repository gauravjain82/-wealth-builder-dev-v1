import { SegmentDashboard } from '../components/segment-dashboard';
import { useBuilderCompany } from '../hooks/use-builder-ai';

export default function BuilderCompanyPage() {
  return <SegmentDashboard title="Company" useData={useBuilderCompany} />;
}
