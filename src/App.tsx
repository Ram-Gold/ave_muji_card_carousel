import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles, Environment } from '@react-three/drei';
import { CardCarousel3D } from './components/CardCarousel3D';
import { TuningPanel } from './components/TuningPanel';
import { AVE_MUJICA_CARDS } from './data/cards';
import { DEFAULT_SETTINGS, type CardSettings } from './data/settings';

function CardFallback() {
  return (
    <mesh>
      <boxGeometry args={[2.6, 3.742, 0.04]} />
      <meshStandardMaterial color="#1a1829" metalness={0.8} roughness={0.3} />
    </mesh>
  );
}

function GoldStudioEnvironment({ goldColor, isLight }: { goldColor: string; isLight?: boolean }) {
  return (
    <Environment background={false}>
      <group>
        <mesh position={[0, 6, -2]} scale={[12, 6, 1]}>
          <planeGeometry />
          <meshBasicMaterial color={isLight ? '#ffffff' : goldColor} />
        </mesh>
        <mesh position={[-6, 2, 2]} scale={[5, 10, 1]}>
          <planeGeometry />
          <meshBasicMaterial color={isLight ? '#ffe9b3' : '#ffc14d'} />
        </mesh>
        <mesh position={[6, 1, 2]} scale={[5, 10, 1]}>
          <planeGeometry />
          <meshBasicMaterial color={isLight ? '#e6c875' : '#d4af37'} />
        </mesh>
        <mesh position={[0, -2, 7]} scale={[8, 8, 1]}>
          <planeGeometry />
          <meshBasicMaterial color={isLight ? '#ffffff' : '#fff3d0'} />
        </mesh>
      </group>
    </Environment>
  );
}

export default function App() {
  const [selectedCardId, setSelectedCardId] = useState<string>('doloris');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showTuner, setShowTuner] = useState<boolean>(false);
  const [settings, setSettings] = useState<CardSettings>(DEFAULT_SETTINGS);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('avemuji_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  const isLight = theme === 'light';

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }
    try { localStorage.setItem('avemuji_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const canvasTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const lastFlipActionTimeRef = useRef<number>(0);
  const mainRef = useRef<HTMLElement>(null);

  const activeCardIndex = AVE_MUJICA_CARDS.findIndex((c) => c.id === selectedCardId);
  const activeCard = activeCardIndex !== -1 ? AVE_MUJICA_CARDS[activeCardIndex] : AVE_MUJICA_CARDS[0];
  const prevCard = AVE_MUJICA_CARDS[(activeCardIndex - 1 + AVE_MUJICA_CARDS.length) % AVE_MUJICA_CARDS.length];
  const nextCard = AVE_MUJICA_CARDS[(activeCardIndex + 1) % AVE_MUJICA_CARDS.length];

  const toggleTheme = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(12);
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof document !== 'undefined' && 'startViewTransition' in document && !reduceMotion) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      setTheme(nextTheme);
    }
  }, [theme]);

  // Switch card with 3D Reverse-Arch Carousel orbital animation
  const handleSwitchCard = useCallback((newCardId: string) => {
    if (newCardId === selectedCardId) return;
    if (navigator.vibrate) navigator.vibrate(10);
    setSelectedCardId(newCardId);
    setIsFlipped(false);
  }, [selectedCardId]);

  const animateToCard = handleSwitchCard;

  const handleFlip = useCallback(() => {
    const now = performance.now();
    if (now - lastFlipActionTimeRef.current < 350) return;
    lastFlipActionTimeRef.current = now;
    if (navigator.vibrate) navigator.vibrate(14);
    setIsFlipped((prev) => !prev);
  }, []);

  const handlePrevCard = useCallback(() => {
    animateToCard(prevCard.id);
  }, [animateToCard, prevCard.id]);

  const handleNextCard = useCallback(() => {
    animateToCard(nextCard.id);
  }, [animateToCard, nextCard.id]);

  // Keyboard shortcuts (silent — no UI, still functional)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrevCard(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNextCard(); }
      else if (e.key === ' ' || e.key.toLowerCase() === 'f') { e.preventDefault(); handleFlip(); }
      else if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleTheme(); }
      else if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTuner((p) => !p); }
      else if (e.key === 'Escape') { setShowTuner(false); }
      else if (e.key >= '1' && e.key <= String(AVE_MUJICA_CARDS.length)) {
        const num = parseInt(e.key, 10);
        e.preventDefault();
        handleSwitchCard(AVE_MUJICA_CARDS[num - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNextCard, handlePrevCard, handleSwitchCard, toggleTheme]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: performance.now() };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const dt = performance.now() - touchStartRef.current.time;
      if (Math.abs(dx) > 65 && Math.abs(dy) < 50 && dt < 400) {
        dx < 0 ? handleNextCard() : handlePrevCard();
        return;
      }
      if (Math.hypot(dx, dy) < 25 && dt < 300) {
        const now = performance.now();
        const timeSince = now - canvasTapRef.current.time;
        const dist = Math.hypot(e.changedTouches[0].clientX - canvasTapRef.current.x, e.changedTouches[0].clientY - canvasTapRef.current.y);
        if (timeSince > 30 && timeSince < 400 && dist < 50) {
          canvasTapRef.current = { time: 0, x: 0, y: 0 };
          handleFlip();
        } else {
          canvasTapRef.current = { time: now, x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
      }
    }
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-300 ease-out ${
        isLight ? 'bg-[#f4f3f8]' : 'bg-[#05050a]'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient colour bloom */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] max-w-[420px] h-[70vw] max-h-[420px] rounded-full blur-[120px] pointer-events-none transition-all duration-500 ease-out ${
          isLight ? 'opacity-15' : 'opacity-20'
        }`}
        style={{ backgroundColor: 'red' }}
      />
      {/* Dark Vignette */}
      <div
        className={`absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_transparent_25%,_#020205_100%)] transition-opacity duration-300 ease-out ${
          isLight ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {/* Light Vignette */}
      <div
        className={`absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_transparent_30%,_rgba(226,222,238,0.5)_100%)] transition-opacity duration-300 ease-out ${
          isLight ? 'opacity-100' : 'opacity-0'
        }`}
      />


      {/* ── Left arrow ── */}
      <button
        type="button"
        onClick={handlePrevCard}
        className={`group absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 ease-out cursor-pointer active:scale-90 ${
          isLight
            ? 'bg-white/60 hover:bg-white/90 border-black/[0.07] text-slate-500 hover:text-slate-900'
            : 'bg-white/[0.05] hover:bg-white/[0.12] border-white/[0.07] text-slate-400 hover:text-white'
        }`}
        aria-label={`Previous: ${prevCard.name}`}
      >
        <svg className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── Right arrow ── */}
      <button
        type="button"
        onClick={handleNextCard}
        className={`group absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 ease-out cursor-pointer active:scale-90 ${
          isLight
            ? 'bg-white/60 hover:bg-white/90 border-black/[0.07] text-slate-500 hover:text-slate-900'
            : 'bg-white/[0.05] hover:bg-white/[0.12] border-white/[0.07] text-slate-400 hover:text-white'
        }`}
        aria-label={`Next: ${nextCard.name}`}
      >
        <svg className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── 3D Canvas ── */}
      <main
        ref={mainRef}
        className="absolute inset-0"
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement)?.tagName === 'CANVAS') handleFlip();
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 6.2], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ambientLight
            intensity={isLight ? settings.goldAmbientIntensity * 1.35 : settings.goldAmbientIntensity}
            color={isLight ? '#ffffff' : '#fff6e0'}
          />
          <hemisphereLight
            args={[settings.goldColor, isLight ? '#cbd5e1' : '#14101e', settings.goldAmbientIntensity * (isLight ? 1.0 : 0.9)]}
          />
          <directionalLight
            position={[5, 6, 5]}
            intensity={settings.goldLightIntensity * (isLight ? 1.25 : 1.0)}
            color={isLight ? '#fffbf0' : settings.goldColor}
          />
          <directionalLight
            position={[-5, 3, 3]}
            intensity={settings.goldLightIntensity * (isLight ? 0.75 : 0.55)}
            color={isLight ? '#e2e8f0' : '#ffe6a8'}
          />
          <GoldStudioEnvironment goldColor={settings.goldColor} isLight={isLight} />
          <Sparkles
            count={20}
            scale={6.0}
            size={isLight ? 1.4 : 1.0}
            speed={0.3}
            opacity={isLight ? 0.3 : 0.18}
            color={isLight ? '#d97706' : settings.goldColor}
          />
          <Suspense fallback={<CardFallback />}>
            <CardCarousel3D
              selectedCardId={selectedCardId}
              onSelectCard={handleSwitchCard}
              settings={settings}
              isFlipped={isFlipped}
              isTuningOpen={showTuner}
              onFlip={handleFlip}
            />
          </Suspense>
        </Canvas>
      </main>

      {/* ── Dynamic Control Island (Morphing Pill & Tuning Inspector) ── */}
      <TuningPanel
        isOpen={showTuner}
        onToggleOpen={() => setShowTuner((p) => !p)}
        settings={settings}
        onChange={setSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
