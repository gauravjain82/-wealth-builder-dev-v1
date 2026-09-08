import { SegmentDashboard } from '../components/segment-dashboard';
import { useBuilderBaseshop } from '../hooks/use-builder-ai';

export default function BuilderBaseshopPage() {
  return <SegmentDashboard title="Baseshop" useData={useBuilderBaseshop} scopeNoun="builders" />;
}
