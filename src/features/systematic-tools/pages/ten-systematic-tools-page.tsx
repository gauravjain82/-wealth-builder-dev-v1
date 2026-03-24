import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Plan } from '@core/types';
import SecureSlidePlayer from '@/shared/components/systematic-tools/secure-slide-player';
import CustomFlyerModal from '@/shared/components/org/custom-flyer-modal';
import BusinessShowerFlyerModal from '@/shared/components/org/business-shower-flyer-modal';
import '@/shared/components/systematic-tools/ten-tools.css';

type ToolOption = {
  title: string;
  thumb?: string;
  embedSrc?: string;
  route?: string;
  openModal?: 'nalFlyer' | 'businessShowerFlyer';
  onClick?: () => void;
};

type ToolItem = {
  gateIndex: number;
  id: string;
  label: string;
  options?: ToolOption[];
  singleOption?: ToolOption;
};

type DraftItem = {
  title: string;
  embedSrc: string;
  route: string;
};

const normalizePlan = (value: unknown): Plan => {
  if (!value) return Plan.NewAgent;
  if (typeof value === 'object') {
    const nested =
      (value as { plan?: unknown; accountType?: unknown; role?: unknown })
        .plan ||
      (value as { accountType?: unknown }).accountType ||
      (value as { role?: unknown }).role;
    return normalizePlan(nested);
  }
  if (typeof value !== 'string') return Plan.NewAgent;

  const raw = value.trim();
  const lower = raw.toLowerCase();
  if (!raw) return Plan.NewAgent;

  if (lower === 'new agent') return Plan.NewAgent;
  if (lower === 'agent') return Plan.Agent;
  if (lower === 'leader') return Plan.Leader;
  if (lower === 'broker') return Plan.Broker;
  if (lower === 'senior broker') return Plan.SeniorBroker;
  if (lower === 'admin') return Plan.Admin;

  const match = Object.values(Plan).find((plan) => plan === raw);
  return match ?? Plan.NewAgent;
};

export default function TenSystematicToolsPage() {
  const { user } = useAuth();

  const resolvePlan = () =>
    normalizePlan(
      user?.plan ||
        user?.accountType ||
        localStorage.getItem('wb.plan') ||
        localStorage.getItem('userType') ||
        Plan.NewAgent
    );

  const [userType, setUserType] = useState(resolvePlan);
  const [isAdmin, setIsAdmin] = useState(() => {
    const normalized = resolvePlan();
    return normalized === Plan.Admin || localStorage.getItem('isAdmin') === 'true';
  });

  useEffect(() => {
    const normalized = resolvePlan();
    setUserType(normalized);
    setIsAdmin(
      normalized === Plan.Admin || localStorage.getItem('isAdmin') === 'true'
    );
  }, [user?.plan, user?.accountType]);

  const THUMBS = {
    unifiedSystemMain:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_77.png?alt=media&token=80b9c316-33e4-4790-9294-98d2f6d4199c',
    unifiedStep2:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_9.png?alt=media&token=d5a26528-86d4-4aa5-b933-936d94f10b18',
    unifiedStep3:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_10.png?alt=media&token=8604decf-e411-4e8f-b8a2-280f8587e0cc',
    unifiedStep3b:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_11.png?alt=media&token=61e3f6a6-958f-4343-a195-6922295088f5',
    unifiedBigEvent:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_12.png?alt=media&token=b3163186-39f3-4a5c-bfab-dd6f3d616651',
    unifiedStep3p1:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_13.png?alt=media&token=2ece3b2d-ecb8-43eb-b359-847dd096d69a',
    unifiedStep3p2:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_14.png?alt=media&token=11f24308-83ff-4e8d-beed-c9f9dee72c2a',
    unifiedStep4:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_15.png?alt=media&token=e88f29bc-7cc8-4830-8a56-22d73f80e43f',
    unifiedStep5:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_16.png?alt=media&token=1e9df008-c4ef-4ca0-802a-3ed515631294',
    nal: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_1.png?alt=media&token=57a8846b-b143-48eb-ade9-36ea2e1dbb10',
    nalBlueCards:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_3.png?alt=media&token=45250450-6038-4473-94fb-d8c3ace8bfcb',
    nal4fold:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_2.png?alt=media&token=c6410552-6f4c-4ce5-92bd-600f9cc05d54',
    businessShower:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_4.png?alt=media&token=05871597-a1f0-406d-beb1-893399d85b64',
    reachMarketFaq:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_5.png?alt=media&token=107ec5af-6789-430d-b15c-0caca7760e0a',
    machine:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_6.png?alt=media&token=ff5ccf0c-d4c3-40e3-b6a8-f5cb78d1c81c',
    accountability:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_7.png?alt=media&token=47b3e4b6-d990-4568-9bdb-7a4d22ddf73a',
    trainerManual:
      'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_8.png?alt=media&token=fd9ab14d-0f9f-4c80-8167-35c5c59e59d8',
  };

  const SLIDE_EMBEDS = {
    unifiedSystem:
      'https://docs.google.com/presentation/d/e/2PACX-1vRyNAB8mooy4OzVU_gcfs20l4cw8g5-xulXPR37LPzJaV54jzH9yuwhyiRLoaN-sE17uwW4u79aGwWn/pubembed?start=false&loop=false&delayms=3000',
    'nal:main':
      'https://docs.google.com/presentation/d/e/2PACX-1vRyNAB8mooy4OzVU_gcfs20l4cw8g5-xulXPR37LPzJaV54jzH9yuwhyiRLoaN-sE17uwW4u79aGwWn/pubembed?start=false&loop=false&delayms=3000',
    'nal:ca':
      'https://docs.google.com/presentation/d/e/2PACX-1vSH8BAmFtZD1nNRZM2DGyuUcVYalL6Za88l3kvuebW7acoMhv0J7nKkwPIVhmFhySXd2wlVCBRUerYi/pubembed?start=false&loop=false&delayms=60000',
    'bs:main':
      'https://docs.google.com/presentation/d/e/2PACX-1vSvtcwPkHKdB8JISQJmNRRd_tHnAj2pC5t86PsbaB523E9W6DG_GwT5tcCzekqKZC067I4fdpmnKzGN/pubembed?start=false&loop=false&delayms=60000&slide=id.g3716174d206_3_0',
    'bs:ca':
      'https://docs.google.com/presentation/d/e/2PACX-1vR3LDPYQQyMTee02-LVHG9nGNU1Jw92VX5wQyTIQR2og0EqYkln_NnFq9edfMibuA4WerqI4P6dLc4D/pubembed?start=false&loop=false&delayms=60000',
    'nal4:present':
      'https://docs.google.com/presentation/d/e/2PACX-1vQ5LDIv1q6M9XIZX8IyGH0keFnRKxwELd3F2Be8SXMrGs98fxs4NKDzEexZ3VwSDcDkkpj-KWKv-bc6/pubembed?start=false&loop=false&delayms=60000',
    'smd:main':
      'https://docs.google.com/presentation/d/e/2PACX-1vTnDiDvxbA6TDW42UgkZg_VAJp_j0D5QKJJcjDB59sNM-aueoo7AgNAVP4yLdETmY_6N1AWSXf-N1tZ/pubembed?start=false&loop=false&delayms=3000',
  };

  const PDF_FILES = {
    fourFold:
      'https://drive.google.com/file/d/1-GYpGxZpQm8xSdlQl8qfXLeK0bmq0-eb/preview',
    reachMarketFaq: '',
    machine:
      'https://drive.google.com/file/d/1WNhK2Crwt_zwE2DsBqyCZ_GDk8p_EfDI/preview',
    accountability:
      'https://drive.google.com/file/d/1_V0uXOsHttT1DGNuMAQw_TfdLYQYm6WY/preview',
    trainerManual: '',
    businessShowerBlueCards:
      'https://drive.google.com/file/d/11HBseh37Hvjwj093LsuGnNRwM59_YnTn/preview',
    newArtBlueCards:
      'https://drive.google.com/file/d/1l6xx0z2k5vQ6Tm_-mPIcWc1-EmsoOBfN/preview',
  };

  const accessMap: Record<Plan, number[]> = {
    [Plan.NewAgent]: [1, 2, 3, 4, 5, 6, 7],
    [Plan.Agent]: [1, 2, 3, 4, 5, 6, 7],
    [Plan.Leader]: [1, 2, 3, 4, 5, 6, 7, 9],
    [Plan.Broker]: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [Plan.SeniorBroker]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [Plan.Admin]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  };

  const allowedIndexesForPlan = (planName: Plan) =>
    new Set(accessMap[planName] || accessMap[Plan.NewAgent]);

  const cloneMenuItem = (item: ToolItem): ToolItem => ({
    ...item,
    options: Array.isArray(item.options)
      ? item.options.map((opt) => ({ ...opt }))
      : undefined,
    singleOption: item.singleOption ? { ...item.singleOption } : undefined,
  });

  const applyPlanFilters = (item: ToolItem, planName: Plan): ToolItem => {
    if (planName !== Plan.NewAgent) return item;

    if (item.id === 'unified-system') {
      const filteredOptions = (item.options || []).filter((opt) =>
        opt.title.includes('Unified System Slides')
      );
      return { ...item, options: filteredOptions };
    }

    if (item.id === 'new-art-of-living') {
      const filtered = (item.options || []).filter(
        (opt) => opt.openModal === 'nalFlyer'
      );
      return { ...item, options: filtered };
    }

    if (item.id === 'business-shower') {
      const filtered = (item.options || []).filter(
        (opt) => opt.openModal === 'businessShowerFlyer'
      );
      return { ...item, options: filtered };
    }

    return item;
  };

  const filterMenuForPlan = (menu: ToolItem[], planName: Plan) => {
    const allowedIndexes = allowedIndexesForPlan(planName);
    return menu
      .filter((item) => allowedIndexes.has(item.gateIndex))
      .map((item) => applyPlanFilters(cloneMenuItem(item), planName));
  };

  const DEFAULT_MENU: ToolItem[] = [
    {
      gateIndex: 1,
      id: 'unified-system',
      label: 'Unified System Presentation',
      options: [
        {
          title: 'Step 1',
          thumb:
            'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Thumbnails%2FWhatsApp%20Image%202026-02-01%20at%205.08.37%20AM.jpeg?alt=media&token=73e2c393-1b68-448a-8a2d-ad2df9ca6856',
          embedSrc: SLIDE_EMBEDS.unifiedSystem,
        },
        {
          title: 'Step 2',
          thumb:
            'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Thumbnails%2FWhatsApp%20Image%202026-02-01%20at%205.10.41%20AM.jpeg?alt=media&token=be47716f-c374-4d75-b784-6623a0f4f01d',
          embedSrc:
            'https://docs.google.com/presentation/d/e/2PACX-1vR-U8zstEic_AvvMRDEE_6bX2I4niyU75VALnf0ijKuE3Lt0CaHJMEFd3UW9-xIuurxzhBqU_j9cimo/pubembed?start=false&loop=false&delayms=3000',
        },
      ],
    },
    {
      gateIndex: 2,
      id: 'new-art-of-living',
      label: 'New Art of Living Presentation',
      options: [
        {
          title: 'Presentation',
          thumb: THUMBS.nal,
          embedSrc: SLIDE_EMBEDS['nal:main'],
        },
        { title: 'Custom Flyer', thumb: THUMBS.nal, openModal: 'nalFlyer' },
        {
          title: 'Blue cards',
          thumb: THUMBS.nalBlueCards,
          embedSrc: PDF_FILES.newArtBlueCards,
        },
        {
          title: 'Presentation (Canada)',
          thumb: THUMBS.nal,
          embedSrc: SLIDE_EMBEDS['nal:ca'],
        },
      ],
    },
    {
      gateIndex: 3,
      id: 'new-art-of-living-4fold',
      label: 'New Art of Living 4 Fold',
      options: [
        {
          title: 'Printable 4 fold (PDF)',
          thumb: THUMBS.nal4fold,
          embedSrc: PDF_FILES.fourFold,
        },
        {
          title: '4 Fold Presentation (Slides)',
          thumb: THUMBS.nal4fold,
          embedSrc: SLIDE_EMBEDS['nal4:present'],
        },
        {
          title: 'New Art of Living video',
          thumb: THUMBS.nal4fold,
          onClick: () => alert('Link not set yet.'),
        },
      ],
    },
    {
      gateIndex: 4,
      id: 'business-shower',
      label: 'Business Shower',
      options: [
        {
          title: 'Presentation',
          thumb: THUMBS.businessShower,
          embedSrc: SLIDE_EMBEDS['bs:main'],
        },
        {
          title: 'Custom Flyer',
          thumb: THUMBS.businessShower,
          openModal: 'businessShowerFlyer',
        },
        {
          title: 'Blue cards',
          thumb: THUMBS.nalBlueCards,
          embedSrc: PDF_FILES.businessShowerBlueCards,
        },
        {
          title: 'Presentation (Canada)',
          thumb: THUMBS.businessShower,
          embedSrc: SLIDE_EMBEDS['bs:ca'],
        },
      ],
    },
    {
      gateIndex: 5,
      id: 'reach-market-faq',
      label: '3 Ways to reach the Market & FAQ',
    },
    {
      gateIndex: 6,
      id: 'unified-licensing',
      label: 'Unified Licensing & Distribution System',
    },
    {
      gateIndex: 7,
      id: 'distribution-machine',
      label: 'Distribution Machine & Acc Sheet',
      options: [
        {
          title: 'Machine (PDF)',
          thumb: THUMBS.machine,
          embedSrc: PDF_FILES.machine,
        },
        {
          title: 'Accountability (PDF)',
          thumb: THUMBS.accountability,
          embedSrc: PDF_FILES.accountability,
        },
      ],
    },
    {
      gateIndex: 8,
      id: 'smd-100k-class',
      label: 'SMD & 100k Class',
      singleOption: {
        title: 'SMD & 100k Class Presentation',
        thumb:
          'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/NAL%20Thumbnails%2FScreenshot_77.png?alt=media&token=80b9c316-33e4-4790-9294-98d2f6d4199c',
        embedSrc: SLIDE_EMBEDS['smd:main'],
      },
    },
    {
      gateIndex: 9,
      id: 'trainer-manual',
      label: 'Trainer Manual',
    },
    { gateIndex: 10, id: 'boot-camp', label: 'Boot Camp' },
  ];

  const MENU_KEY = 'tenTools:menu';
  const loadMenuFromStorage = () => {
    try {
      const raw = localStorage.getItem(MENU_KEY);
      return raw ? (JSON.parse(raw) as ToolItem[]) : null;
    } catch {
      return null;
    }
  };
  const saveMenuToStorage = (menu: ToolItem[]) => {
    try {
      localStorage.setItem(MENU_KEY, JSON.stringify(menu));
    } catch {}
  };

  const initialMenuRef = useRef<ToolItem[]>(
    loadMenuFromStorage() || DEFAULT_MENU
  );
  const [menuData, setMenuData] = useState<ToolItem[]>(
    initialMenuRef.current
  );

  const [activeId, setActiveId] = useState<string | null>(
    () => initialMenuRef.current?.[0]?.id || null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const visibleMenu = useMemo(
    () => filterMenuForPlan(menuData, userType),
    [menuData, userType]
  );

  useEffect(() => {
    if (!visibleMenu.find((m) => m.id === activeId)) {
      setActiveId(visibleMenu[0]?.id || null);
    }
  }, [visibleMenu, activeId]);

  const activeItem = useMemo(
    () => visibleMenu.find((m) => m.id === activeId) || visibleMenu[0],
    [visibleMenu, activeId]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeId]);

  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playerSrc, setPlayerSrc] = useState('');
  const [playerTitle, setPlayerTitle] = useState('');
  const [showFlyerModal, setShowFlyerModal] = useState(false);
  const [showBusinessShowerModal, setShowBusinessShowerModal] = useState(false);

  const isSlidesUrl = (src: string) =>
    src.includes('/pubembed?') || src.includes('/embed?');

  const isPdfUrl = (src: string) =>
    src.includes('/preview') || src.includes('drive.google.com');

  const openEmbed = (src: string, title: string) => {
    setPlayerSrc(src);
    setPlayerTitle(title || 'Viewer');
    setIsPlayerOpen(true);
  };

  const onOptionActivate = (opt: ToolOption, labelPrefix = '') => {
    if (opt.openModal === 'nalFlyer') {
      setShowFlyerModal(true);
      return;
    }
    if (opt.openModal === 'businessShowerFlyer') {
      setShowBusinessShowerModal(true);
      return;
    }
    if (opt.route) {
      window.location.href = opt.route;
      return;
    }
    if (opt.embedSrc) {
      if (isSlidesUrl(opt.embedSrc)) {
        setPlayerTitle(`${labelPrefix}${opt.title}`);
        setPlayerSrc(opt.embedSrc);
        setIsPlayerOpen(true);
      } else {
        openEmbed(opt.embedSrc, `${labelPrefix}${opt.title}`);
      }
      return;
    }
    if (opt.onClick) opt.onClick();
  };

  const onLeftKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!visibleMenu.length) return;

    const idx = visibleMenu.findIndex((m) => m.id === activeId);
    const safeIndex = idx === -1 ? 0 : idx;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = visibleMenu[(safeIndex + 1) % visibleMenu.length];
      if (next) setActiveId(next.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next =
        visibleMenu[(safeIndex - 1 + visibleMenu.length) % visibleMenu.length];
      if (next) setActiveId(next.id);
    }
  };

  const [editMode, setEditMode] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    if (!editMode || !activeItem) return;
    const src = activeItem;
    let items: ToolOption[] = [];
    if (src.singleOption) items = [src.singleOption];
    if (Array.isArray(src.options)) items = src.options.slice();
    setDraftItems(
      items.map((it) => ({
        title: it.title || '',
        embedSrc: it.embedSrc || '',
        route: it.route || '',
      }))
    );
  }, [editMode, activeItem]);

  const addDraftItem = () => {
    setDraftItems((arr) => [
      ...arr,
      { title: 'New item', embedSrc: '', route: '' },
    ]);
  };

  const updateDraftItem = (i: number, patch: Partial<DraftItem>) => {
    setDraftItems((arr) =>
      arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
    );
  };

  const deleteDraftItem = (i: number) => {
    setDraftItems((arr) => arr.filter((_, idx) => idx !== i));
  };

  const moveDraftItem = (i: number, dir: 'up' | 'down') => {
    setDraftItems((arr) => {
      const to = dir === 'up' ? i - 1 : i + 1;
      if (to < 0 || to >= arr.length) return arr;
      const copy = arr.slice();
      const [item] = copy.splice(i, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const saveDraft = () => {
    const newMenu = menuData.map((m) => {
      if (m.id !== activeItem?.id) return m;

      const original = m.singleOption
        ? [m.singleOption]
        : Array.isArray(m.options)
        ? m.options
        : [];
      const cleaned = draftItems
        .map((d, idx) => {
          const src = original[idx] || {};
          return {
            thumb: src.thumb,
            title: (d.title || '').trim(),
            embedSrc: (d.embedSrc || '').trim(),
            route: (d.route || '').trim(),
          };
        })
        .filter((d) => d.title);

      if (cleaned.length <= 1) {
        const single = cleaned[0] || undefined;
        return { ...m, singleOption: single, options: undefined };
      }
      return { ...m, singleOption: undefined, options: cleaned };
    });

    setMenuData(newMenu);
    saveMenuToStorage(newMenu);
    setEditMode(false);
  };

  const cancelDraft = () => setEditMode(false);

  const renderCard = (opt: ToolOption, onClick: () => void) => (
    <button className="vault-card as-button" onClick={onClick} title={opt.title}>
      {opt.thumb ? (
        <div className="thumb-wrap">
          <img src={opt.thumb} alt={opt.title} loading="lazy" />
        </div>
      ) : (
        <div className="thumb-wrap" />
      )}
      <div className="card-foot">
        <span className="name">{opt.title}</span>
      </div>
    </button>
  );

  const renderRow = (opt: ToolOption, onClick: () => void) => (
    <button className="vault-row as-button" onClick={onClick} title={opt.title}>
      <span className="row-title">{opt.title}</span>
      <span className="row-arrow">›</span>
    </button>
  );

  const getCurrentItems = () => {
    if (!activeItem) return [] as ToolOption[];
    if (activeItem.singleOption) {
      return [activeItem.singleOption];
    }
    if (Array.isArray(activeItem.options) && activeItem.options.length) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return activeItem.options.slice(startIndex, endIndex);
    }
    return [] as ToolOption[];
  };

  const getTotalPages = () => {
    if (!activeItem) return 0;
    if (activeItem.singleOption) return 1;
    if (Array.isArray(activeItem.options)) {
      return Math.ceil(activeItem.options.length / itemsPerPage);
    }
    return 0;
  };

  const renderPagination = () => {
    const totalPages = getTotalPages();
    if (totalPages <= 1) return null;

    return (
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          ←
        </button>

        <div className="pagination-info">
          Page {currentPage} of {totalPages}
        </div>

        <button
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          →
        </button>
      </div>
    );
  };

  const renderRightView = () => {
    if (!activeItem) {
      return (
        <div className="content-stage">
          <div className="stage-text">
            <p>No tools are available for your current plan yet.</p>
          </div>
        </div>
      );
    }

    if (!editMode) {
      const currentItems = getCurrentItems();

      if (currentItems.length === 0) {
        return (
          <section className="vault-grid">
            <div className="empty">No content available yet for this item.</div>
          </section>
        );
      }

      return (
        <div className="vault-content">
          <section className="vault-grid">
            {currentItems.map((opt) =>
              opt.thumb
                ? renderCard(opt, () => onOptionActivate(opt, ''))
                : renderRow(opt, () => onOptionActivate(opt, ''))
            )}
          </section>
          {renderPagination()}
        </div>
      );
    }

    return (
      <section className="edit-panel">
        <div className="editor-note">
          Edit the items for <strong>{activeItem.label}</strong>. Paste
          Vimeo/Slides/PDF embed links in <code>Embed URL</code>, or use
          <code>Route</code> for internal pages.
          <br />
          <em>
            Thumbnails are code-only. To change a thumbnail, edit the
            <code>DEFAULT_MENU</code> item in this file.
          </em>
        </div>

        <div className="edit-list">
          {draftItems.map((it, i) => (
            <div className="edit-item" key={`draft-${i}`}>
              <div className="edit-row">
                <label>Title</label>
                <input
                  value={it.title || ''}
                  onChange={(e) => updateDraftItem(i, { title: e.target.value })}
                  placeholder="Item title"
                />
              </div>
              <div className="edit-row two">
                <div>
                  <label>Embed URL (Slides, Vimeo, PDF)</label>
                  <input
                    value={it.embedSrc || ''}
                    onChange={(e) =>
                      updateDraftItem(i, { embedSrc: e.target.value })
                    }
                    placeholder="https://... (leave blank if using Route)"
                  />
                </div>
                <div>
                  <label>Route (internal)</label>
                  <input
                    value={it.route || ''}
                    onChange={(e) => updateDraftItem(i, { route: e.target.value })}
                    placeholder="/some-internal-path"
                  />
                </div>
              </div>

              <div className="edit-actions">
                <button
                  className="ghost"
                  onClick={() => moveDraftItem(i, 'up')}
                  disabled={i === 0}
                >
                  ↑ Move up
                </button>
                <button
                  className="ghost"
                  onClick={() => moveDraftItem(i, 'down')}
                  disabled={i === draftItems.length - 1}
                >
                  ↓ Move down
                </button>
                <button className="danger" onClick={() => deleteDraftItem(i)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="editor-footer">
          <button className="glass-btn" onClick={addDraftItem}>
            + Add item
          </button>
          <div className="spacer" />
          <button className="ghost" onClick={cancelDraft}>
            Cancel
          </button>
          <button className="glass-btn primary" onClick={saveDraft}>
            Save changes
          </button>
        </div>
      </section>
    );
  };

  return (
    <div className="vault">
      <aside className="vault-left" onKeyDown={onLeftKeyDown} tabIndex={0}>
        <div className="vault-left-head">
          <h2>10 Systematic Tools</h2>
        </div>

        <nav className="vault-menu">
          {visibleMenu.length === 0 ? (
            <div className="empty">No tools available for this plan.</div>
          ) : (
            visibleMenu.map((m) => {
              const active = m.id === activeId;
              return (
                <button
                  key={m.id}
                  className={`vault-menu-item ${active ? 'active' : ''}`}
                  onClick={() => setActiveId(m.id)}
                  title={m.label}
                >
                  <span className="icon" style={numberBadgeStyle}>
                    {m.gateIndex}
                  </span>
                  <span className="text">{m.label}</span>
                  <span className="chev">›</span>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      <main className="vault-right">
        <header className="vault-right-head">
          <div className="title">
            <h3>{activeItem?.label || '10 Systematic Tools'}</h3>
          </div>
          {isAdmin && (
            <div className="editor-bar">
              <button className="glass-btn" onClick={() => setEditMode((v) => !v)}>
                {editMode ? 'Close Editor' : '✎ Edit'}
              </button>
            </div>
          )}
        </header>

        {renderRightView()}
      </main>

      {isPlayerOpen && (
        <div className="player-overlay" onClick={() => setIsPlayerOpen(false)}>
          <div className="player-container" onClick={(e) => e.stopPropagation()}>
            <button
              className="player-close-btn"
              onClick={() => setIsPlayerOpen(false)}
            >
              ✖ Close
            </button>
            <div className="player-title">{playerTitle}</div>
            {isSlidesUrl(playerSrc) ? (
              <SecureSlidePlayer embedSrc={playerSrc} />
            ) : isPdfUrl(playerSrc) ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <iframe
                  src={playerSrc}
                  title={playerTitle}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allowFullScreen
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 80,
                    height: 60,
                    zIndex: 10,
                    pointerEvents: 'auto',
                    background: 'rgba(0, 0, 0, 0.85)',
                  }}
                />
              </div>
            ) : (
              <video
                title={playerTitle || 'Embedded content'}
                src={playerSrc}
                className="vault-embedded-video"
                controls
                playsInline
              />
            )}
          </div>
        </div>
      )}

      <CustomFlyerModal
        isOpen={showFlyerModal}
        onClose={() => setShowFlyerModal(false)}
      />

      <BusinessShowerFlyerModal
        isOpen={showBusinessShowerModal}
        onClose={() => setShowBusinessShowerModal(false)}
      />
    </div>
  );
}

const numberBadgeStyle: React.CSSProperties = {
  display: 'inline-grid',
  placeItems: 'center',
  width: 22,
  height: 22,
  borderRadius: 6,
  background: 'rgba(255,255,255,0.06)',
  fontWeight: 700,
  fontSize: '0.8rem',
};
