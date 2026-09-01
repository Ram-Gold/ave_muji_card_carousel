import { useState, useEffect } from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

export function InfoModal({ isOpen, onClose, isLight }: InfoModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Double rAF ensures browser paints initial state before triggering transition
      let raf2: number;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setShouldRender(false), 240);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12 transition-opacity ${
        animateIn
          ? 'opacity-100 duration-260 ease-[var(--ease-out)]'
          : 'opacity-0 duration-200 ease-in pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop overlay */}
      <div
        className={`absolute inset-0 transition-opacity ${
          isLight ? 'bg-black/20' : 'bg-black/50'
        } ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-2xl rounded-[32px] p-8 sm:p-12 transition-[transform,opacity] will-change-transform ${
          animateIn
            ? 'opacity-100 scale-100 translate-y-0 duration-260 ease-[var(--ease-out)]'
            : 'opacity-0 scale-[0.96] translate-y-3 duration-200 ease-out'
        } ${
          isLight
            ? 'bg-[#f4f3f8] text-slate-900 shadow-[0_24px_64px_rgba(0,0,0,0.18)] border border-slate-300/80'
            : 'bg-[#0e0e17] text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)] border border-white/10'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 ${
            isLight
              ? 'bg-black/5 text-black/60 hover:bg-black/10 hover:text-black'
              : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
          }`}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:gap-12">
          {/* Stagger item 1: Title Header */}
          <div
            className={`transition-[transform,opacity] duration-300 ease-[var(--ease-out)] ${
              animateIn
                ? 'opacity-100 translate-y-0 delay-[40ms]'
                : 'opacity-0 translate-y-2'
            }`}
          >
            <h2 className="text-3xl sm:text-5xl font-serif tracking-tight leading-none">
              Ave<br />Mujica
            </h2>
          </div>

          {/* Stagger item 2 & 3: Content Body */}
          <div className="flex flex-col justify-center space-y-6">
            <p
              className={`text-lg leading-relaxed font-light transition-[transform,opacity] duration-300 ease-[var(--ease-out)] ${
                isLight ? 'text-black/90' : 'text-white/90'
              } ${
                animateIn
                  ? 'opacity-100 translate-y-0 delay-[80ms]'
                  : 'opacity-0 translate-y-2'
              }`}
            >
              <strong className="font-bold">Welcome to the world of Ave Mujica.</strong>
              <br />
              This is an unofficial fan website dedicated to{' '}
              <a
                href="https://en.wikipedia.org/wiki/BanG_Dream!_Ave_Mujica"
                target="_blank"
                rel="noopener noreferrer"
                className={`font-medium border-b transition-colors ${
                  isLight
                    ? 'border-black hover:bg-black hover:text-white'
                    : 'border-white hover:bg-white hover:text-black'
                }`}
              >
                the band
              </a>
              .
            </p>

            <div
              className={`space-y-4 text-sm leading-relaxed transition-[transform,opacity] duration-300 ease-[var(--ease-out)] ${
                isLight ? 'text-black/70' : 'text-white/70'
              } ${
                animateIn
                  ? 'opacity-100 translate-y-0 delay-[120ms]'
                  : 'opacity-0 translate-y-2'
              }`}
            >
              <p>
                Created by{' '}
                <a
                  href="https://ramguinto.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-medium underline underline-offset-4 transition-colors ${
                    isLight
                      ? 'decoration-black/30 hover:decoration-black text-black'
                      : 'decoration-white/30 hover:decoration-white text-white'
                  }`}
                >
                  Ram Guinto
                </a>
                . This project leverages a Physically Based Rendering (PBR) pipeline alongside Three.js and React Three Fiber to bring the cards to life.
              </p>
              <p>
                <a
                  href="https://github.com/Ram-Gold/ave_muji_card_carousel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 font-medium underline underline-offset-4 transition-colors ${
                    isLight
                      ? 'decoration-black/30 hover:decoration-black text-black'
                      : 'decoration-white/30 hover:decoration-white text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  GitHub Repository
                </a>
              </p>
              <p className="italic opacity-80 text-xs">
                Card artwork by Bushiroad. All rights belong to their respective owners.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
