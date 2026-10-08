import Player from "@vimeo/player";

/**
 * The few player operations watch tracking needs. Vimeo embeds and plain video files
 * implement it, so one tracker enforces the same rules on both.
 */
export interface PlaybackAdapter {
  getDuration(): Promise<number>;
  seekTo(seconds: number): void;
  setRate(rate: number): void;
  /** Fires as playback moves, including right after a seek. */
  onTime(callback: (seconds: number) => void): void;
  onPlay(callback: () => void): void;
  onEnded(callback: () => void): void;
  onRateChange(callback: (rate: number) => void): void;
  /** Stops listening; the element itself is removed by React. */
  dispose(): void;
}

/** A Vimeo embed, driven through the Vimeo Player SDK. */
export class VimeoPlayback implements PlaybackAdapter {
  private readonly player: Player;

  constructor(iframe: HTMLIFrameElement) {
    this.player = new Player(iframe);
  }

  getDuration(): Promise<number> {
    return this.player.getDuration();
  }

  seekTo(seconds: number): void {
    void this.player.setCurrentTime(seconds).catch(() => undefined);
  }

  setRate(rate: number): void {
    // Rejects when the video owner has speed controls turned off; nothing to cap then.
    void this.player.setPlaybackRate(rate).catch(() => undefined);
  }

  onTime(callback: (seconds: number) => void): void {
    this.player.on("timeupdate", (event) => callback(event.seconds));
    this.player.on("seeked", (event) => callback(event.seconds));
  }

  onPlay(callback: () => void): void {
    this.player.on("play", callback);
  }

  onEnded(callback: () => void): void {
    this.player.on("ended", callback);
  }

  onRateChange(callback: (rate: number) => void): void {
    this.player.on("playbackratechange", (event) => callback(event.playbackRate));
  }

  dispose(): void {
    for (const name of ["timeupdate", "seeked", "play", "ended", "playbackratechange"] as const) {
      this.player.off(name);
    }
  }
}

/** A plain video file (e.g. Firebase Storage) in a native <video> element. */
export class Html5Playback implements PlaybackAdapter {
  private readonly listeners: Array<[string, EventListener]> = [];

  constructor(private readonly video: HTMLVideoElement) {}

  getDuration(): Promise<number> {
    if (Number.isFinite(this.video.duration) && this.video.duration > 0) {
      return Promise.resolve(this.video.duration);
    }
    return new Promise((resolve) => {
      this.listen("loadedmetadata", () => resolve(this.video.duration));
    });
  }

  seekTo(seconds: number): void {
    this.video.currentTime = seconds;
  }

  setRate(rate: number): void {
    this.video.playbackRate = rate;
  }

  onTime(callback: (seconds: number) => void): void {
    const report = () => callback(this.video.currentTime);
    this.listen("timeupdate", report);
    this.listen("seeking", report);
  }

  onPlay(callback: () => void): void {
    this.listen("play", callback);
  }

  onEnded(callback: () => void): void {
    this.listen("ended", callback);
  }

  onRateChange(callback: (rate: number) => void): void {
    this.listen("ratechange", () => callback(this.video.playbackRate));
  }

  dispose(): void {
    for (const [name, listener] of this.listeners) {
      this.video.removeEventListener(name, listener);
    }
    this.listeners.length = 0;
  }

  private listen(name: string, listener: EventListener): void {
    this.video.addEventListener(name, listener);
    this.listeners.push([name, listener]);
  }
}

/** Page links (Vimeo, YouTube) play in an iframe; anything else is a file for <video>. */
export function isEmbedUrl(url: string): boolean {
  return url.includes("vimeo.com") || url.includes("youtube.com") || url.includes("youtu.be");
}
