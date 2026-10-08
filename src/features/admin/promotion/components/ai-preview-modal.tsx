import { Modal } from '@/shared/components';
import { AITestPanel } from '@/features/promotion/components/ai-test-panel';
import '@/features/promotion/pages/promotion.css';
import type { AdminVideo } from '../types';

interface AIPreviewModalProps {
  video: AdminVideo | null;
  onClose: () => void;
}

/**
 * "Test with Sophia" for promotion managers: the learner's AI Test panel in preview
 * mode, so a lesson can be tried end to end (voice test, typed test, practice) without
 * a promotion track, the quiz lock or the daily limits — even before it is switched on.
 */
export function AIPreviewModal({ video, onClose }: AIPreviewModalProps) {
  if (!video) return null;
  return (
    <Modal
      open
      title="Test with Sophia"
      subtitle={video.title}
      onClose={onClose}
      contentClassName="max-w-[760px]"
    >
      {/* promo-page supplies the learner theme the panel is styled with. */}
      <div className="promo-page promo-preview">
        <AITestPanel module={{ id: video.id, status: 'ai_test' }} preview />
      </div>
    </Modal>
  );
}
