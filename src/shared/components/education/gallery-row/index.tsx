import { VideoCard } from '../video-card';
import './gallery-row.css';

interface CardData {
  title: string;
  thumb?: string;
  videoUrl: string;
}

interface GalleryRowProps {
  title: string;
  cards: CardData[];
  renderMode?: 'modal' | 'link';
}

export function GalleryRow({ title, cards, renderMode = 'modal' }: GalleryRowProps) {
  return (
    <section className="biz-row">
      <div className="biz-row-head">
        <div className="biz-row-dots" aria-hidden="true" />
        <h2 className="biz-row-title">{title}</h2>
        <div className="biz-row-dots" aria-hidden="true" />
      </div>
      <div className="biz-cards one-line">
        {cards.map((card, idx) => (
          <VideoCard key={idx} data={card} renderMode={renderMode} />
        ))}
      </div>
    </section>
  );
}
