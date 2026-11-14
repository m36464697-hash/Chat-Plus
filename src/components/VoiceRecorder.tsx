import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Send, AlertCircle } from 'lucide-react';
import { playSound } from '../hooks/useSound';

interface VoiceRecorderProps {
  onSendAudio: (audioDataUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
  soundEnabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendAudio,
  onCancel,
  soundEnabled = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(16).fill(20));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef<boolean>(false);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      cancelledRef.current = false;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('متصفحك أو جهازك لا يدعم تسجيل الصوت.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Live Web Audio API AnalyserNode for genuine waveform visualization
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);
          const dataArr = new Uint8Array(analyser.frequencyBinCount);

          const tick = () => {
            analyser.getByteFrequencyData(dataArr);
            const nextLevels: number[] = [];
            for (let i = 0; i < 16; i++) {
              const val = dataArr[i] || 0;
              nextLevels.push(Math.max(18, Math.min(100, Math.round((val / 255) * 100))));
            }
            setLevels(nextLevels);
            animFrameRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch {
        // Fallback silently if AudioContext is unavailable
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      if (soundEnabled) playSound('record_start');

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 400);
    } catch {
      setErrorMsg('تعذر الوصول إلى الميكروفون. يرجى توصيل ميكروفون أو السماح بالإذن من المتصفح.');
    }
  };

  const handleStopAndSend = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    if (soundEnabled) playSound('record_stop');

    const finalDuration = Math.max(duration, 1);

    mediaRecorderRef.current.onstop = () => {
      if (cancelledRef.current) return;
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.onerror = () => {
        setErrorMsg('تعذر قراءة التسجيل الصوتي');
        cleanup();
      };
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        onSendAudio(base64Data, finalDuration);
        cleanup();
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (soundEnabled) playSound('record_stop');
    if (mediaRecorderRef.current && isRecording && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    onCancel();
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  if (errorMsg) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-2xl text-red-700 dark:text-red-200 text-xs w-full">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={startRecording}
            className="min-h-[38px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium text-xs transition-colors cursor-pointer"
          >
            إعادة المحاولة
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-[38px] px-3.5 py-1.5 bg-slate-200 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.12] rounded-xl text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-[#F2F4F8] dark:bg-white/[0.04] border border-indigo-200/80 dark:border-indigo-400/25 rounded-[18px] w-full">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0">جاري التسجيل</span>

        <div className="flex items-center gap-0.5 h-6 flex-1 max-w-[140px]">
          {levels.map((lvl, idx) => (
            <span
              key={idx}
              style={{ height: `${lvl}%` }}
              className="flex-1 bg-rose-500 dark:bg-rose-400 rounded-full transition-all duration-75"
            />
          ))}
        </div>

        <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums shrink-0">
          {formatTimer(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          title="إلغاء وحذف التسجيل"
          aria-label="إلغاء التسجيل"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleStopAndSend}
          className="min-h-[40px] flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          aria-label="إرسال التسجيل الصوتي"
        >
          <span>إرسال</span>
          <Send className="w-3.5 h-3.5 rotate-180" />
        </button>
      </div>
    </div>
  );
};
