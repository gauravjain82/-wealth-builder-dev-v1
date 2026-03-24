import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseDb } from '@/infrastructure/firebase';

interface CarouselImage {
  id: number;
  name: string;
  uploadedAt: string;
  url: string;
}

interface CarouselData {
  contests?: CarouselImage[];
  recognition?: CarouselImage[];
  updatedAt?: any;
}

export function useCarouselImages() {
  const [contestImages, setContestImages] = useState<string[]>([]);
  const [recognitionImages, setRecognitionImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback images in case Firestore has no data
  const FALLBACK_CONTEST = [
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/contest1.png?alt=media&token=ac2e1b23-8fe7-4b74-8601-ec92b36098d0',
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/contest2.png?alt=media&token=384724b9-d4b8-4db4-a7c0-aa95acbf4ea0',
  ];

  const FALLBACK_RECOGNITION = [
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/rec1.png?alt=media&token=df042a0f-924f-487f-a355-85eea6cd8075',
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/rec2.png?alt=media&token=3575b31b-a1d3-455e-8382-99f1bc99c2fd',
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/rec3.png?alt=media&token=336e9000-0c3b-47be-8aa3-32b6407c5eab',
    'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/rec5.png?alt=media&token=20b65d82-b54b-4d05-8463-7acf46bc8054',
  ];

  useEffect(() => {
    try {
      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        doc(firebaseDb, 'config', 'carouselImages'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as CarouselData;
            const contests = data.contests?.map((img) => img.url) || FALLBACK_CONTEST;
            const recognition = data.recognition?.map((img) => img.url) || FALLBACK_RECOGNITION;

            setContestImages(contests.length > 0 ? contests : FALLBACK_CONTEST);
            setRecognitionImages(recognition.length > 0 ? recognition : FALLBACK_RECOGNITION);
          } else {
            // Use fallback if no document exists
            setContestImages(FALLBACK_CONTEST);
            setRecognitionImages(FALLBACK_RECOGNITION);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Error loading carousel images:', err);
          setContestImages(FALLBACK_CONTEST);
          setRecognitionImages(FALLBACK_RECOGNITION);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('Error setting up carousel listener:', e);
      // Use fallback on error
      setContestImages(FALLBACK_CONTEST);
      setRecognitionImages(FALLBACK_RECOGNITION);
      setError(e instanceof Error ? e.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  return {
    contestImages,
    recognitionImages,
    loading,
    error,
  };
}
