export type HomepageContent = {
  backgroundImageUrl: string;
  trailerVideoUrl: string;
  heroTitle: string;
  registerUrl: string;
  eventsTitle: string;
  eventsVideoUrl: string;
  recognitionTitle: string;
  recognitionVideoUrl: string;
};

export type HomepageVideoSlot = 'trailer' | 'events' | 'recognition' | 'background';
