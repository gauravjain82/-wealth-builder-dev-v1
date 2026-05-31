import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Play, Pause, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import './carousel-card.css';

interface CarouselCardProps {
  title: string;
  images: string[];
  currentIndex: number;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
  onFullscreen: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface CanvaVideoCardProps {
  title: string;
  videoUrl: string;
}

export function CarouselCard({
  title,
  images,
  currentIndex,
  autoPlay,
  onToggleAutoPlay,
  onFullscreen,
  onNext,
  onPrevious,
}: CarouselCardProps) {
  return (
    <Card className="carousel-card">
      <CardHeader>
        <div className="carousel-card__header">
          <CardTitle className="carousel-card__title">{title}</CardTitle>
          <div className="carousel-card__controls">
            <Button
              variant="outline"
              size="sm"
              className="bg-black/30 border-white/20 text-white hover:bg-black/50"
              onClick={onToggleAutoPlay}
            >
              {autoPlay ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-black/30 border-white/20 text-white hover:bg-black/50"
              onClick={onFullscreen}
            >
              <Maximize2 size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="carousel-card__image-container">
          <img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`${title} ${currentIndex + 1}`}
            className="carousel-card__image"
          />

          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="carousel-card__nav-btn carousel-card__nav-btn--prev text-white"
            onClick={onPrevious}
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="carousel-card__nav-btn carousel-card__nav-btn--next text-white"
            onClick={onNext}
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CanvaVideoCard({ title, videoUrl }: CanvaVideoCardProps) {
  return (
    <Card className="carousel-card">
      <CardHeader>
        <div className="carousel-card__header">
          <CardTitle className="carousel-card__title">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="carousel-card__image-container">
          <iframe
            src={videoUrl}
            title={`${title} video`}
            className="carousel-card__video"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </CardContent>
    </Card>
  );
}
