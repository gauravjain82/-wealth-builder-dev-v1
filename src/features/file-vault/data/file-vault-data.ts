import { Plan } from '@core/types';

export type VaultItem = {
  title: string;
  href: string;
  type?: 'row';
  thumb?: string;
};

export type VaultSection = {
  id: string;
  icon: string;
  label: string;
  items: VaultItem[];
};

export const filterVaultForPlan = (data: VaultSection[], plan: Plan): VaultSection[] => {
  if (plan !== Plan.NewAgent) return data;

  const allowed = new Set(['i am your life insurance policy']);

  return data
    .map((section) => {
      const items = section.items.filter((item) => allowed.has(item.title.trim().toLowerCase()));
      if (!items.length) return null;
      return { ...section, items };
    })
    .filter((section): section is VaultSection => Boolean(section));
};

export const VAULT_DATA: VaultSection[] = [
  {
    id: 'licensing',
    icon: '🪪',
    label: 'Licensing Resources',
    items: [
      { title: 'Trainer Presentations', href: '#', type: 'row' },
      { title: 'Documents', href: '#', type: 'row' },
    ],
  },
  {
    id: 'forms',
    icon: '🗂️',
    label: 'Forms & Documents',
    items: [
      {
        title: 'Frequently asked questions',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?q=80&w=1600&auto=format&fit=crop',
      },
      {
        title: 'I am your Life Insurance Policy',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=1600&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'presentations',
    icon: '📽️',
    label: 'Presentations',
    items: [
      {
        title: 'Step 1 & Step 2',
        href: 'https://docs.google.com/presentation/d/1pnM_gYAewBf5sroGoT-UQE-5wvGAuCXifTLKmS7Pmi4/preview?usp=drive_link',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_55.png?alt=media&token=6f9724b3-e37b-4569-943e-a598a3e101a9p',
      },
      {
        title: 'Introduction Part II Video',
        href: 'https://vimeo.com/1055390494/e945f1d24e?fl=pl&fe=sh',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_56.png?alt=media&token=d0578823-7cdf-4452-b144-edbfb72062a1',
      },
      {
        title: 'Step 3 Part I',
        href: 'https://docs.google.com/presentation/d/e/2PACX-1vR13g-a7rdvokLZmIzlArdLvh-Ysu4PYBuKDdHnCk8IegE4ScrVMvnjAPX9CCFRZQ/pub?start=false&loop=false&delayms=3000',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_57.png?alt=media&token=82fbfad7-414e-43d5-95b1-a0b3c8086424p',
      },
      {
        title: 'Step 3 Part I Video',
        href: '#',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_58.png?alt=media&token=f1817133-6820-4aae-9e31-422a73f75506',
      },
      {
        title: 'Step 3 Part II',
        href: '#',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_59.png?alt=media&token=d3ed0dcb-d8c3-406e-bd1d-0f2c2a32a096',
      },
      {
        title: 'Step 3 Part II Video',
        href: '#',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_60.png?alt=media&token=4c35db38-1692-466d-824a-f72d3f65936c',
      },
      {
        title: 'Step 4',
        href: '#',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_61.png?alt=media&token=0bc49268-71aa-4969-9539-30df3ec87aec',
      },
      {
        title: 'Step 5',
        href: '#',
        thumb: 'NA',
      },
      {
        title: 'Big Event',
        href: '#',
        thumb: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Screenshot_62.png?alt=media&token=56d16c8b-eb05-4811-8bcc-834799310152',
      },
    ],
  },
  {
    id: 'all-agents',
    icon: '👥',
    label: 'Presentations - All Agents',
    items: [
      {
        title: 'Step 1 & Step 2',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1519331379826-b1f0213a04f1?q=80&w=1600&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'broker',
    icon: '🧭',
    label: 'Broker',
    items: [{ title: 'Trainer Program 11.2023', href: '#', type: 'row' }],
  },
  {
    id: 'partners',
    icon: '⚡',
    label: 'Power Partners',
    items: [
      {
        title: 'What Men Need / What Women Need',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop',
      },
      {
        title: 'Jas Dhaliwal',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1544716278-28b8c6f1f2b8?q=80&w=1600&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'maxout',
    icon: '🚀',
    label: 'Maxout Monday',
    items: [
      {
        title: 'Mindset Of Rec, Saving, Licensing, Net Licensing & Winning',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=1600&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'napkin',
    icon: '🧻',
    label: 'Napkin Presentation',
    items: [
      {
        title: 'Napkin',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=1600&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'trainer',
    icon: '📘',
    label: 'Trainer Manuals',
    items: [
      {
        title: 'Trainer Manual US',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1600&auto=format&fit=crop',
      },
      {
        title: 'Trainer Manual Canada',
        href: '#',
        thumb: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1600&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'assistant',
    icon: '📝',
    label: 'Assistant Documents',
    items: [{ title: 'Licensing Videos', href: '#', type: 'row' }],
  },
  {
    id: 'canada',
    icon: '🍁',
    label: 'Canada Presentations',
    items: [],
  },
  {
    id: 'spanish',
    icon: '🇪🇸',
    label: 'Spanish Presentations',
    items: [],
  },
];
