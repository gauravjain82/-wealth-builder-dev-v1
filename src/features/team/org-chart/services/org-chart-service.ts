const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface OrgChartLink {
  ancestor_id: number;
  descendant_id: number;
  depth: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchOrgChart(): Promise<OrgChartLink[]> {
  const response = await fetch(`${API_BASE_URL}/api/network/hierarchy/my_links/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to fetch org chart: ${response.statusText}`);
  const data = (await response.json()) as OrgChartLink[];
  return Array.isArray(data) ? data : [];
}
