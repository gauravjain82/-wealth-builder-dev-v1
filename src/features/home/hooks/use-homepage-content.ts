import { useEffect, useState } from 'react';
import { DEFAULT_HOMEPAGE_CONTENT, fetchHomepageContent } from '../services/home-content-service';
import type { HomepageContent } from '../types';

export function useHomepageContent() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchHomepageContent()
      .then((next) => {
        if (active) setContent(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { content, loading };
}
