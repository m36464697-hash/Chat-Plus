import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isSender?: boolean;
  accentButtonClass?: string;
  autoPlaySignal?: number;
  onPlayStart?: () => void;
  onEnded?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  duration: initialDuration = 0,
  isSender = false,
  accentButtonClass = 'bg-indigo-600 text-white hover:bg-indigo-500',
  autoPlaySignal = 0,
  onPlayStart,
  onEnded,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(initialDuration || 0);
  }, [src, initialDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEndedRef.current?.();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (!autoPlaySignal || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        onPlayStart?.();
      })
      .catch(() => {
        // Auto-play may be blocked by browser policy
      });
  }, [autoPlaySignal]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          onPlayStart?.();
        })
        .catch((err) => {
          console.error('Audio play error:', err);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleSpeed = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const barHeights = React.useMemo(() => {
    const heights: number[] = [];
    let seed = src.length || 10;
    for (let i = 0; i < 24; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const h = 25 + Math.floor((seed / 233280) * 75);
      heights.push(h);
    }
    return heights;
  }, [src]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex flex-col gap-2 p-2.5 rounded-[16px] w-full min-w-[210px] max-w-[280px] sm:max-w-[320px] select-none ${
        isSender
          ? 'bg-black/15 text-white border border-white/15'
          : 'bg-[#F2F4F8] dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/[0.08]'
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs ${
            isSender ? 'bg-white text-indigo-700 hover:bg-slate-100' : accentButtonClass
          }`}
          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="relative h-8 flex items-center gap-0.5 cursor-pointer overflow-hidden py-1">
            {barHeights.map((h, idx) => {
              const barPercent = (idx / barHeights.length) * 100;
              const isActive = barPercent <= progressPercent;
              return (
                <div
                  key={idx}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-full transition-colors duration-150 ${
                    isActive
                      ? isSender
                        ? 'bg-white'
                        : 'bg-indigo-600 dark:bg-indigo-400'
                      : isSender
                      ? 'bg-white/35'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              );
            })}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              aria-label="مؤشر وقت التسجيل الصوتي"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums opacity-90">
            <span>{formatTime(currentTime)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSpeed}
                className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/[0.08] hover:bg-black/20 font-sans font-semibold text-[10px] transition-colors cursor-pointer"
                title="تغيير سرعة التشغيل"
              >
                {playbackRate}x
              </button>
              <span>{formatTime(duration || initialDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
