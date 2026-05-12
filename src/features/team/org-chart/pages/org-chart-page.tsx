import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAuth } from '@/features/auth/hooks/use-auth';
import orgChartService, {
  type OrgChartUser,
  type OrgViewType,
} from '../services/org-chart-service';
import { TrackerUserProfileModal } from '@/features/team/components/tracker-user-profile-modal';
import type { TrackerUserProfile } from '@/features/team/services/tracker-user-profile-service';
import OrgNode, { type OrgNodeData } from '../components/org-node';
import OrgToolbar from '../components/org-toolbar';
import { FILTER_COLORS, FILTER_KEYS } from '../utils/filters';
import { findNodePosition, layoutTree, type TreeNode } from '../utils/layout';
import '../styles/org-chart.css';

const nodeTypes = {
  custom: OrgNode,
};

const GLOBAL_MAX_TREE_DEPTH = 20;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const ALL_VIEW_OPTIONS: Array<{ id: OrgViewType; label: string; description: string }> = [
  { id: 'baseshop', label: 'BaseShop', description: 'Direct organization' },
  { id: 'superbase', label: 'SuperBase', description: 'Direct SMD team' },
  { id: 'superteam', label: 'SuperTeam', description: 'Extended SMD team' },
];

interface SegmentSummaryResponse {
  accessible_segments?: string[];
  segments?: Array<{
    segment?: string;
    visible?: boolean;
  }>;
}

interface TeamOption {
  id: string;
  name: string;
  level: string;
}

interface BrokerResponseItem {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  level?: {
    code?: string;
    name?: string;
  } | null;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

function normalizeView(value: string): OrgViewType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'baseshop' || normalized === 'superbase' || normalized === 'superteam') {
    return normalized;
  }

  return null;
}

function toSegmentParam(view: OrgViewType): string {
  return view.toUpperCase();
}

function toBrokerOption(item: BrokerResponseItem): TeamOption | null {
  if (item.id === undefined || item.id === null) {
    return null;
  }

  const fullName = item.full_name?.trim();
  const firstLast = `${item.first_name || ''} ${item.last_name || ''}`.trim();
  const name = fullName || firstLast || item.username || '';

  return {
    id: String(item.id),
    name: name || String(item.id),
    level: item.level?.code || item.level?.name || 'BROKER',
  };
}

async function fetchAvailableViews(): Promise<OrgViewType[]> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/segments/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch segments: ${response.statusText}`);
  }

  const payload = (await response.json()) as SegmentSummaryResponse;
  const accessibleViews = (payload.accessible_segments || [])
    .map((segment) => normalizeView(segment))
    .filter((segment): segment is OrgViewType => Boolean(segment));

  if (accessibleViews.length > 0) {
    return ALL_VIEW_OPTIONS.map((option) => option.id).filter((option) => accessibleViews.includes(option));
  }

  const visibleViews = (payload.segments || [])
    .filter((segment) => Boolean(segment.visible))
    .map((segment) => normalizeView(segment.segment || ''))
    .filter((segment): segment is OrgViewType => Boolean(segment));

  if (visibleViews.length > 0) {
    return ALL_VIEW_OPTIONS.map((option) => option.id).filter((option) => visibleViews.includes(option));
  }

  return ['baseshop'];
}

async function fetchTeamOptions(view: OrgViewType): Promise<TeamOption[]> {
  const params = new URLSearchParams({ segment: toSegmentParam(view) });
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/brokers/?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch brokers: ${response.statusText}`);
  }

  const payload = (await response.json()) as BrokerResponseItem[];
  return payload
    .map((item) => toBrokerOption(item))
    .filter((item): item is TeamOption => Boolean(item));
}

function focusOnNodeUtil(nodeId: string, nodes: Node[], reactFlowInstance: ReturnType<typeof useReactFlow>, zoomLevel = 1.2) {
  const position = findNodePosition(nodes, nodeId);
  if (!position) return;

  reactFlowInstance.setCenter(position.x + 80, position.y + 95, {
    zoom: zoomLevel,
    duration: 800,
  });
}

function OrgChart() {
  const { user } = useAuth();
  const reactFlowInstance = useReactFlow();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentViewType, setCurrentViewType] = useState<OrgViewType>('baseshop');
  const [selectedSMDId, setSelectedSMDId] = useState<string | null>(null);
  const [viewOptions, setViewOptions] = useState<Array<{ id: OrgViewType; label: string; description: string }>>([
    ALL_VIEW_OPTIONS[0],
  ]);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [loadingTeamOptions, setLoadingTeamOptions] = useState(false);
  const [users, setUsers] = useState<OrgChartUser[]>([]);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [expandedDepthOverrideNodes, setExpandedDepthOverrideNodes] = useState<Set<string>>(new Set());
  const [expandDepth, setExpandDepth] = useState<number | null>(1);
  const [apiChildrenMap, setApiChildrenMap] = useState<Record<string, string[]>>({});
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [pendingCenterId, setPendingCenterId] = useState<string | null>(null);
  const [profileOpenFor, setProfileOpenFor] = useState<{
    userId: number;
    userName: string;
    avatarUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;

    const loadViews = async () => {
      try {
        const availableViews = await fetchAvailableViews();
        if (!alive) return;

        const nextOptions = ALL_VIEW_OPTIONS.filter((option) => availableViews.includes(option.id));
        const resolvedOptions = nextOptions.length > 0 ? nextOptions : [ALL_VIEW_OPTIONS[0]];
        setViewOptions(resolvedOptions);

        if (!resolvedOptions.some((option) => option.id === currentViewType)) {
          setCurrentViewType(resolvedOptions[0].id);
          setSelectedSMDId(null);
          setSelectedUserId(null);
          setCollapsedNodes(new Set());
          setExpandedDepthOverrideNodes(new Set());
        }
      } catch {
        if (!alive) return;
        setViewOptions([ALL_VIEW_OPTIONS[0]]);
        if (currentViewType !== 'baseshop') {
          setCurrentViewType('baseshop');
          setSelectedSMDId(null);
          setSelectedUserId(null);
          setCollapsedNodes(new Set());
          setExpandedDepthOverrideNodes(new Set());
        }
      }
    };

    void loadViews();

    return () => {
      alive = false;
    };
  }, [currentViewType]);

  useEffect(() => {
    if (currentViewType === 'baseshop') {
      setTeamOptions([]);
      setLoadingTeamOptions(false);
      return;
    }

    let alive = true;

    const loadTeamOptions = async () => {
      setLoadingTeamOptions(true);
      try {
        const options = await fetchTeamOptions(currentViewType);
        if (!alive) return;

        setTeamOptions(options);
        if (selectedSMDId && !options.some((option) => option.id === selectedSMDId)) {
          setSelectedSMDId(null);
          setSelectedUserId(null);
          setCollapsedNodes(new Set());
          setExpandedDepthOverrideNodes(new Set());
        }
      } catch {
        if (!alive) return;
        setTeamOptions([]);
      } finally {
        if (alive) {
          setLoadingTeamOptions(false);
        }
      }
    };

    void loadTeamOptions();

    return () => {
      alive = false;
    };
  }, [currentViewType, selectedSMDId]);

  const byId = useMemo(() => {
    const map: Record<string, OrgChartUser> = {};
    users.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [users]);

  const parentMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.keys(apiChildrenMap).forEach((parentId) => {
      (apiChildrenMap[parentId] || []).forEach((childId) => {
        map[childId] = parentId;
      });
    });
    return map;
  }, [apiChildrenMap]);

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      const requiresLeaderSelection = currentViewType === 'superbase' || currentViewType === 'superteam';
      if (requiresLeaderSelection && !selectedSMDId) {
        if (!alive) return;
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const transformedData = await orgChartService.fetchOrgChartData(currentViewType, selectedSMDId);
        if (!alive) return;

        setUsers(transformedData.users);
        setRootNodeId(transformedData.rootId || selectedSMDId || localStorage.getItem('wb.userId') || null);
        setApiChildrenMap(transformedData.childrenMap || {});
        setError(null);
      } catch (fetchError) {
        if (!alive) return;
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load org chart';
        setError(message);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    return () => {
      alive = false;
    };
  }, [currentViewType, selectedSMDId]);

  const tree = useMemo<TreeNode | null>(() => {
    if (!users.length) return null;

    const currentUserId = rootNodeId || user?.id || localStorage.getItem('wb.userId') || users[0].id;
    const currentUser = byId[currentUserId] || {
      id: currentUserId,
      name: user?.displayName || user?.email || 'Root User',
      email: user?.email || '',
      plan: 'Agent',
      level: 'Agent',
      agencyCode: '',
      parentId: null,
      recruitedById: null,
      leaderId: null,
      roles: [],
      training: false,
      bigEvent: false,
      keyPlayer: false,
      netLicenseAmount: 0,
      netLicensed: false,
      licensed: false,
      hasProduction: false,
      client: false,
      hasChildren: Boolean(apiChildrenMap[currentUserId]?.length),
      childCount: (apiChildrenMap[currentUserId] || []).length,
    };
    if (!currentUser) return null;

    const buildTree = (nodeUser: OrgChartUser, depth = 0, visited = new Set<string>()): TreeNode | null => {
      if (!nodeUser || visited.has(nodeUser.id) || depth > GLOBAL_MAX_TREE_DEPTH) {
        return null;
      }

      visited.add(nodeUser.id);
      const childIds = apiChildrenMap[nodeUser.id] || [];
      const children = childIds
        .map((childId) => {
          const childUser = byId[childId];
          return childUser ? buildTree(childUser, depth + 1, visited) : null;
        })
        .filter((child): child is TreeNode => Boolean(child));

      return {
        id: nodeUser.id,
        name: nodeUser.name,
        plan: nodeUser.plan,
        level: nodeUser.level,
        agencyCode: nodeUser.agencyCode,
        email: nodeUser.email,
        profilePicture: '',
        photoURL: '',
        training: nodeUser.training,
        bigEvent: nodeUser.bigEvent,
        keyPlayer: nodeUser.keyPlayer,
        netLicenseAmount: nodeUser.netLicenseAmount,
        netLicensed: nodeUser.netLicensed,
        licensed: nodeUser.licensed,
        hasProduction: nodeUser.hasProduction,
        client: nodeUser.client,
        childCount: Math.max(childIds.length, nodeUser.childCount || 0),
        children,
        roles: nodeUser.roles,
        levelCounts: nodeUser.levelCounts,
      };
    };

    return buildTree(currentUser);
  }, [apiChildrenMap, byId, rootNodeId, user?.displayName, user?.email, user?.id, users]);

  const hasChildren = useCallback((nodeId: string): boolean => {
    const userHasChildren = Boolean(byId[nodeId]?.hasChildren);
    const loadedChildren = (apiChildrenMap[nodeId] || []).length > 0;
    return userHasChildren || loadedChildren;
  }, [apiChildrenMap, byId]);

  const getDescendantCount = useCallback((nodeId: string, treeNode: TreeNode | null): number => {
    if (!treeNode) return 0;

    if (treeNode.id === nodeId) {
      if (treeNode.children.length === 0) {
        return treeNode.childCount;
      }

      let count = treeNode.children.length;
      treeNode.children.forEach((child) => {
        count += getDescendantCount(child.id, child);
      });
      return count;
    }

    for (const child of treeNode.children) {
      const count = getDescendantCount(nodeId, child);
      if (count > 0) return count;
    }

    return 0;
  }, []);

  const getNodeFilterMatches = useCallback((nodeData: OrgNodeData) => {
    const matches: string[] = [];
    if (nodeData.training) matches.push(FILTER_KEYS.BPM);
    if (nodeData.bigEvent) matches.push(FILTER_KEYS.BIG_EVENT);
    if (nodeData.keyPlayer) matches.push(FILTER_KEYS.KEY_PLAYER);
    if (nodeData.licensed) matches.push(FILTER_KEYS.LICENSED);
    if (Boolean(nodeData.netLicensed)) matches.push(FILTER_KEYS.NET_LICENSED);
    if (Boolean(nodeData.client) || nodeData.hasProduction) matches.push(FILTER_KEYS.CLIENT);
    return matches;
  }, []);

  const getNodeFilterBackground = useCallback((nodeData: OrgNodeData): Record<string, string> => {
    if (!activeFilters.size) return {};

    const matches = getNodeFilterMatches(nodeData).filter((match) => activeFilters.has(match));
    if (!matches.length) return {};

    if (matches.length === 1) {
      const color = FILTER_COLORS[matches[0]];
      return {
        background: color,
        border: `2px solid ${color}`,
      };
    }

    const colors = matches.map((key) => FILTER_COLORS[key]);
    const width = 100 / colors.length;
    const stops = colors
      .map((color, index) => `${color} ${index * width}% ${(index + 1) * width}%`)
      .join(', ');

    return {
      background: `linear-gradient(to bottom, ${stops})`,
      border: `2px solid ${colors[0]}`,
    };
  }, [activeFilters, getNodeFilterMatches]);

  const handleToggleCollapse = useCallback((nodeId: string, isDepthLimited: boolean) => {
    const isCurrentlyCollapsed = collapsedNodes.has(nodeId) || isDepthLimited;

    if (isCurrentlyCollapsed) {
      if (isDepthLimited) {
        setExpandedDepthOverrideNodes((previous) => {
          const next = new Set(previous);
          next.add(nodeId);
          return next;
        });
      } else {
        setExpandedDepthOverrideNodes((previous) => {
          const next = new Set(previous);
          next.add(nodeId);
          return next;
        });
      }

      setCollapsedNodes((previous) => {
        const next = new Set(previous);
        next.delete(nodeId);
        return next;
      });
      return;
    }

    setExpandedDepthOverrideNodes((previous) => {
      const next = new Set(previous);
      next.delete(nodeId);
      return next;
    });

    setCollapsedNodes((previous) => {
      const next = new Set(previous);
      next.add(nodeId);
      return next;
    });
  }, [collapsedNodes]);

  const { nodes, edges } = useMemo(() => {
    if (!tree) return { nodes: [] as Node[], edges: [] as Edge[] };

    const depthMap = new Map<string, number>();
    const walkDepth = (node: TreeNode, depth = 0) => {
      depthMap.set(node.id, depth);
      node.children.forEach((child) => walkDepth(child, depth + 1));
    };
    walkDepth(tree);

    const { nodes: rawNodes, edges: rawEdges } = layoutTree(tree, {
      focusNodeId: tree.id,
      nodeWidth: 160,
      nodeHeight: 190,
      rankSep: 72,
      nodeSep: 40,
    });

    const visibleNodeIds = new Set<string>();
    const depthLimitedNodeIds = new Set<string>();

    const collectVisibleNodeIds = (node: TreeNode, depth = 0, parentDepthOverride = false) => {
      visibleNodeIds.add(node.id);

      const isCollapsed = collapsedNodes.has(node.id);
      const depthOverrideActive = parentDepthOverride || expandedDepthOverrideNodes.has(node.id);
      const hasChildrenNode = hasChildren(node.id);
      const isDepthLimited =
        expandDepth !== null
        && depth >= expandDepth
        && hasChildrenNode
        && !depthOverrideActive;

      if (isDepthLimited) {
        depthLimitedNodeIds.add(node.id);
      }

      if (isCollapsed || isDepthLimited) {
        return;
      }

      node.children.forEach((child) => collectVisibleNodeIds(child, depth + 1, depthOverrideActive));
    };

    collectVisibleNodeIds(tree);

    const enhancedNodes = rawNodes
      .filter((node) => visibleNodeIds.has(node.id))
      .map((node) => {
      const currentData = node.data as OrgNodeData;
      const depth = depthMap.get(node.id) || 0;
      const hasChildrenNode = hasChildren(node.id);
      const isDepthLimited =
        expandDepth !== null
        && depth >= expandDepth
        && hasChildrenNode
        && depthLimitedNodeIds.has(node.id);

      const updatedData: OrgNodeData = {
        ...currentData,
        filterBackground: getNodeFilterBackground(currentData),
        isCollapsed: collapsedNodes.has(node.id) || isDepthLimited,
        hasChildren: hasChildrenNode,
        childrenCount: getDescendantCount(node.id, tree),
        onToggleCollapse: () => {
          void handleToggleCollapse(node.id, isDepthLimited);
        },
        onClick: () => {
          setSelectedUserId(node.id);
          focusOnNodeUtil(node.id, rawNodes, reactFlowInstance, 1.5);
        },
        onOpenProfile: () => {
          const parsedId = Number.parseInt(node.id, 10);
          if (!Number.isFinite(parsedId)) return;
          setProfileOpenFor({
            userId: parsedId,
            userName: currentData.name || 'User Profile',
            avatarUrl: currentData.profilePicture || currentData.photoURL || null,
          });
        },
      };

      return {
        ...node,
        data: updatedData,
        className: selectedUserId === node.id ? 'orgchart-node-selected' : undefined,
      };
    });

    const visibleIds = new Set(enhancedNodes.map((node) => node.id));
    return {
      nodes: enhancedNodes,
      edges: rawEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    };
  }, [
    collapsedNodes,
    expandedDepthOverrideNodes,
    expandDepth,
    getDescendantCount,
    getNodeFilterBackground,
    handleToggleCollapse,
    hasChildren,
    reactFlowInstance,
    selectedUserId,
    tree,
  ]);

  useEffect(() => {
    if (!pendingCenterId || !nodes.length) return;
    const hasTarget = nodes.some((node) => node.id === pendingCenterId);
    if (!hasTarget) return;

    requestAnimationFrame(() => {
      focusOnNodeUtil(pendingCenterId, nodes, reactFlowInstance, 1.3);
      setPendingCenterId(null);
    });
  }, [nodes, pendingCenterId, reactFlowInstance]);

  const handleSearch = useCallback((searchName: string) => {
    const normalized = searchName.trim().toLowerCase();
    if (!normalized || !tree) return;

    const target = users.find((candidate) => candidate.name.trim().toLowerCase() === normalized);
    if (!target) {
      return;
    }

    const pathIds = [target.id];
    let cursor = target.id;
    let depth = 0;
    let guard = 0;

    while (cursor && cursor !== tree.id && guard < 1000) {
      const parent = parentMap[cursor];
      if (!parent) break;
      pathIds.push(parent);
      cursor = parent;
      depth += 1;
      guard += 1;
    }

    setExpandDepth(Math.min(depth + 1, 20));
    setCollapsedNodes((previous) => {
      const next = new Set(previous);
      pathIds.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedUserId(target.id);
    setPendingCenterId(target.id);
  }, [parentMap, tree, users]);

  const handleCenterOnMe = useCallback(() => {
    if (!tree) return;
    setSelectedUserId(tree.id);
    setPendingCenterId(tree.id);
  }, [tree]);

  const handleProfileSaved = useCallback((updated: TrackerUserProfile) => {
    const nextName = updated.full_name?.trim() || `${updated.first_name || ''} ${updated.last_name || ''}`.trim();
    const nextAgencyCode = updated.agency_code || '';

    setUsers((prev) =>
      prev.map((entry) =>
        entry.id === String(updated.id)
          ? {
              ...entry,
              name: nextName || entry.name,
              email: updated.email || entry.email,
              agencyCode: nextAgencyCode || entry.agencyCode,
            }
          : entry
      )
    );

    setProfileOpenFor((prev) => {
      if (!prev || prev.userId !== updated.id) return prev;
      return {
        ...prev,
        userName: nextName || prev.userName,
        avatarUrl: updated.avatar_url ?? prev.avatarUrl,
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="orgchart-container">
        <div className="orgchart-header">
          <h1 className="orgchart-title">Organization Chart</h1>
        </div>
        <div className="orgchart-loading">
          <div className="orgchart-loading-spinner" />
          <p>Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orgchart-container">
        <div className="orgchart-header">
          <h1 className="orgchart-title">Organization Chart</h1>
        </div>
        <div className="orgchart-empty">
          <div className="orgchart-empty-icon">!</div>
          <p className="orgchart-empty-text">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orgchart-container">
      <div className="orgchart-header">
        <h1 className="orgchart-title">Organization Chart</h1>
        <p className="orgchart-subtitle">
          {user ? `${user.displayName || user.email}'s organization` : 'Organizational Structure'}
        </p>
      </div>

      <OrgToolbar
        currentView={currentViewType}
        viewOptions={viewOptions}
        loadingTeamOptions={loadingTeamOptions}
        onViewChange={(view) => {
          setCurrentViewType(view);
          setSelectedSMDId(null);
          setSelectedUserId(null);
          setCollapsedNodes(new Set());
          setExpandedDepthOverrideNodes(new Set());
        }}
        onSearch={handleSearch}
        onCenterOnMe={handleCenterOnMe}
        activeFilters={activeFilters}
        onFilterToggle={(filterKey) => {
          setActiveFilters((previous) => {
            const next = new Set(previous);
            if (next.has(filterKey)) {
              next.delete(filterKey);
            } else {
              next.add(filterKey);
            }
            return next;
          });
        }}
        teamOptions={teamOptions}
        selectedSMDId={selectedSMDId}
        onSMDSelect={(smdId) => {
          setSelectedSMDId(smdId);
          setSelectedUserId(null);
          setCollapsedNodes(new Set());
          setExpandedDepthOverrideNodes(new Set());
        }}
        onExpandToDepth={(depth) => {
          setExpandDepth(depth);
          setCollapsedNodes(new Set());
          setExpandedDepthOverrideNodes(new Set());
          if (tree?.id) {
            setSelectedUserId(tree.id);
            setPendingCenterId(tree.id);
          }
        }}
        expandDepth={expandDepth}
        users={users}
      />

      <div className="orgchart-flow-wrapper">
        {nodes.length === 0 ? (
          <div className="orgchart-empty">
            <div className="orgchart-empty-icon">[]</div>
            <p className="orgchart-empty-text">No organizational data to display</p>
          </div>
        ) : (
          <ReactFlow<Node, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
              padding: 0.1,
              includeHiddenNodes: false,
              minZoom: 0.2,
              maxZoom: 1.5,
            }}
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'step',
              animated: false,
            }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            selectNodesOnDrag={false}
            panOnDrag
            zoomOnScroll
            preventScrolling
          >
            <Background color="#94a3b8" gap={16} />
            <Controls />
          </ReactFlow>
        )}

        <div className="viewport-indicator">
          <div className="viewport-indicator-content">
            <div className="viewport-indicator-title">Current View</div>
            <div className="viewport-indicator-info">
              {selectedUserId ? (
                <>
                  <div className="viewport-indicator-selected">
                    Selected: {users.find((candidate) => candidate.id === selectedUserId)?.name || 'Unknown'}
                  </div>
                  <div className="viewport-indicator-hint">Click on other nodes to navigate</div>
                </>
              ) : (
                <div className="viewport-indicator-hint">Click on nodes to navigate</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TrackerUserProfileModal
        open={Boolean(profileOpenFor)}
        userId={profileOpenFor?.userId ?? null}
        fallbackName={profileOpenFor?.userName}
        fallbackAvatarUrl={profileOpenFor?.avatarUrl}
        onClose={() => setProfileOpenFor(null)}
        onSaved={handleProfileSaved}
      />
    </div>
  );
}

export default function OrgChartPage() {
  return (
    <ReactFlowProvider>
      <OrgChart />
    </ReactFlowProvider>
  );
}
