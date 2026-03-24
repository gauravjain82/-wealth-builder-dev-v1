import { useState } from 'react';
import { VideoModal } from '../video-modal';
import './faq-section.css';

interface FaqItem {
  q: string;
  videoUrl: string;
}

interface FaqSectionProps {
  title: string;
  items: FaqItem[];
  renderMode?: 'modal' | 'link';
}

function FaqItemComponent({ q, videoUrl, renderMode = 'modal' }: FaqItem & { renderMode?: 'modal' | 'link' }) {
  const [openModal, setOpenModal] = useState(false);

  const openVideo = () => {
    if (renderMode === 'link') {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    } else {
      setOpenModal(true);
    }
  };

  return (
    <>
      <details className="biz-faq-item">
        <summary className="biz-faq-q">{q}</summary>
        <div className="biz-faq-a">
          <button className="biz-btn biz-btn-white" onClick={openVideo}>
            Watch answer
          </button>
        </div>
      </details>
      <VideoModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        src={videoUrl}
        title={q}
      />
    </>
  );
}

export function FaqSection({ title, items, renderMode = 'modal' }: FaqSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="biz-faq">
      <h2 className="biz-faq-title">{title}</h2>
      <div className="biz-faq-list">
        {items.map((item, i) => (
          <FaqItemComponent
            key={i}
            q={item.q}
            videoUrl={item.videoUrl}
            renderMode={renderMode}
          />
        ))}
      </div>
    </section>
  );
}
