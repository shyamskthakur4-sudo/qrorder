import React, { useState, useEffect } from 'react';
import { Bell, Flame, X, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';

interface PushNotificationDetail {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  orderId?: string;
  chimeType?: string;
  timestamp: number;
}

export const SwiggyPushBanner: React.FC = () => {
  const [currentNotif, setCurrentNotif] = useState<PushNotificationDetail | null>(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const handlePushEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PushNotificationDetail>;
      if (customEvent.detail) {
        setCurrentNotif(customEvent.detail);
        setProgress(100);
      }
    };

    window.addEventListener('cafeos:push_notification', handlePushEvent);
    return () => {
      window.removeEventListener('cafeos:push_notification', handlePushEvent);
    };
  }, []);

  useEffect(() => {
    if (!currentNotif) return;

    const DURATION = 6000;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          setCurrentNotif(null);
          return 0;
        }
        return prev - step;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [currentNotif]);

  if (!currentNotif) return null;

  const handleClickAction = () => {
    if (currentNotif.url) {
      if (currentNotif.url.startsWith('http') && !currentNotif.url.includes(window.location.host)) {
        window.open(currentNotif.url, '_blank');
      } else {
        window.location.href = currentNotif.url;
      }
    }
    setCurrentNotif(null);
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] w-[94%] max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950/95 border-2 border-amber-500/80 shadow-[0_12px_40px_-5px_rgba(245,158,11,0.45)] backdrop-blur-2xl p-4 text-slate-100 space-y-3">
        {/* Glow ambient accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header row: Brand / Pill / Close */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm shadow-amber-500/30 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-current" />
              <span>Instant Lock-Screen Push</span>
            </span>
          </div>

          <button
            onClick={() => setCurrentNotif(null)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification Content Body */}
        <div className="flex items-start gap-3.5 relative z-10">
          {/* Logo / Food Icon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-lg shadow-amber-500/30 shrink-0">
            {currentNotif.icon && currentNotif.icon !== '/favicon.svg' ? (
              <img
                src={currentNotif.icon}
                alt="Brand"
                className="w-full h-full object-cover rounded-[14px]"
              />
            ) : (
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-xl">
                ☕
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-extrabold text-slate-100 font-['Outfit'] tracking-tight leading-snug">
              {currentNotif.title}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
              {currentNotif.body}
            </p>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="pt-1 flex items-center gap-2 relative z-10">
          <button
            onClick={handleClickAction}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <span>Open & View Live Status</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentNotif(null)}
            className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-800"
          >
            Dismiss
          </button>
        </div>

        {/* Progress Bar Timer */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
