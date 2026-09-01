import { useState, useRef, useEffect } from 'react';
import type { CardSettings } from '../data/settings';
import { DEFAULT_SETTINGS, PRESETS } from '../data/settings';

export interface TuningPanelProps {
  settings: CardSettings;
  onChange: (newSettings: CardSettings) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const GOLD_COLORS = [
  { name: 'Pure Gold', hex: '#ffd700' },
  { name: 'Champagne', hex: '#f7e7b4' },
  { name: 'Warm Amber', hex: '#ffb300' },
  { name: 'Rose Gold', hex: '#e8a598' },
  { name: 'Imperial', hex: '#d4af37' },
  { name: 'Platinum', hex: '#e6e0d0' },
];

type QuickProperty =
  | 'beamIntensity'
  | 'beamAngle'
  | 'anisotropy'
  | 'goldLightIntensity'
  | 'goldAmbientIntensity'
  | 'borderRadius'
  | 'metalness'
  | 'roughness'
  | 'clearcoat'
  | 'normalScale'
  | 'envMapIntensity'
  | 'maxTiltAngle'
  | 'damping';

const QUICK_PROPERTIES: { id: QuickProperty; label: string; min: number; max: number; step: number; hint: string; format?: (v: number) => string }[] = [
  { id: 'beamIntensity', label: 'Beam Power', min: 0, max: 2.5, step: 0.05, hint: 'Light line brightness' },
  {
    id: 'beamAngle',
    label: 'Angle',
    min: 0,
    max: 3.1415,
    step: 0.05,
    hint: 'Line tilt',
    format: (v) => `${Math.round((v * 180) / Math.PI)}°`,
  },
  { id: 'anisotropy', label: 'Streak', min: 0, max: 1, step: 0.05, hint: 'Foil stretch' },
  { id: 'goldLightIntensity', label: 'Key Light', min: 0, max: 3, step: 0.05, hint: 'Directional' },
  { id: 'goldAmbientIntensity', label: 'Ambient', min: 0, max: 2, step: 0.05, hint: 'Fill warmth' },
  { id: 'borderRadius', label: 'Corner', min: 0, max: 0.35, step: 0.01, hint: 'Radius' },
  { id: 'metalness', label: 'Metal', min: 0, max: 1, step: 0.01, hint: 'Foil' },
  { id: 'roughness', label: 'Roughness', min: 0, max: 1, step: 0.01, hint: 'Gloss/Matte' },
  { id: 'clearcoat', label: 'Clearcoat', min: 0, max: 1, step: 0.01, hint: 'Lacquer' },
  { id: 'normalScale', label: 'Emboss', min: 0, max: 2, step: 0.05, hint: 'Depth' },
  { id: 'envMapIntensity', label: 'Glint', min: 0, max: 4, step: 0.1, hint: 'Environment' },
  { id: 'maxTiltAngle', label: 'Tilt', min: 0.1, max: 1.2, step: 0.02, hint: 'Max rotation' },
  { id: 'damping', label: 'Spring', min: 2, max: 20, step: 0.5, hint: 'Return speed' },
];

interface SliderControlProps {
  label: string;
  value: number;
  displayValue?: string;
  min: number;
  max: number;
  step: number;
  isLight: boolean;
  onChange: (val: number) => void;
  enableWheel?: boolean;
  className?: string;
}

function SliderControl({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  isLight,
  onChange,
  enableWheel = false,
  className = '',
}: SliderControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enableWheel) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const direction = e.deltaY < 0 ? 1 : -1;
      const stepDecimals = step.toString().split('.')[1]?.length || 0;
      const precision = Math.max(stepDecimals, 2);
      const rawNext = value + direction * step;
      const clamped = Math.min(max, Math.max(min, rawNext));
      const rounded = parseFloat(clamped.toFixed(precision));
      onChange(rounded);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [value, min, max, step, onChange, enableWheel]);

  return (
    <div
      ref={containerRef}
      className={`p-3 rounded-[18px] transition-colors duration-200 ${
        isLight ? 'bg-black/5 hover:bg-black/[0.07]' : 'bg-white/5 hover:bg-white/[0.07]'
      } ${className}`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
          {label}
        </span>
        <span className="text-xs font-bold text-amber-500 bg-amber-500/20 px-2.5 py-0.5 rounded-full font-mono">
          {displayValue ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-black/10 appearance-none rounded-full cursor-pointer"
      />
    </div>
  );
}

export function TuningPanel({
  settings,
  onChange,
  isOpen,
  onToggleOpen,
  theme,
  onToggleTheme,
}: TuningPanelProps) {
  const [isCompact, setIsCompact] = useState<boolean>(true);
  const [selectedQuickProp, setSelectedQuickProp] = useState<QuickProperty>('beamIntensity');
  const [activeTab, setActiveTab] = useState<'beam' | 'light' | 'material' | 'physics'>('beam');
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const quickPillsRef = useRef<HTMLDivElement>(null);
  const presetsPillsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

  // Horizontal scroll with mouse wheel on pill containers
  useEffect(() => {
    const attachWheel = (el: HTMLDivElement | null) => {
      if (!el) return () => {};
      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) && e.deltaY !== 0) {
          e.preventDefault();
          el.scrollBy({
            left: e.deltaY,
            behavior: 'smooth',
          });
        }
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    };

    const cleanup1 = attachWheel(quickPillsRef.current);
    const cleanup2 = attachWheel(presetsPillsRef.current);
    const cleanup3 = attachWheel(tabsRef.current);

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
    };
  }, [isOpen, isCompact, activeTab]);

  // Keyboard shortcut 'E' to toggle expand/compact only when TuningPanel is active
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsCompact((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const updateField = <K extends keyof CardSettings>(field: K, value: CardSettings[K]) => {
    if (field === 'beamAngle') {
      onChange({
        ...settings,
        beamAngle: value as number,
        anisotropyRotation: value as number,
      });
    } else {
      onChange({
        ...settings,
        [field]: value,
      });
    }
  };

  const handleCopyJson = async () => {
    const jsonStr = JSON.stringify(settings, null, 2);
    let success = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(jsonStr);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = jsonStr;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopyStatus('Copied! ✓');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      setTimeout(() => setCopyStatus(''), 2000);
    } else {
      setShowJsonModal(true);
    }
  };

  const currentQuickDef = QUICK_PROPERTIES.find((p) => p.id === selectedQuickProp) || QUICK_PROPERTIES[0];
  const currentValue = (settings[currentQuickDef.id] as number) ?? 0;
  const displayFormatted = currentQuickDef.format ? currentQuickDef.format(currentValue) : currentValue.toFixed(2);

  const targetWidth = !isOpen ? '92px' : isCompact ? '410px' : '520px';
  const targetHeight = !isOpen ? '40px' : isCompact ? '132px' : 'min(490px, 72vh)';
  const targetRadius = !isOpen ? '20px' : isCompact ? '18px' : '24px';

  return (
    <>
      {/* ── Dynamic Island ── */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none origin-bottom ${
          !isOpen
            ? 'shadow-[0_4px_24px_rgba(0,0,0,0.18)]'
            : isCompact
            ? 'shadow-[0_20px_50px_rgba(0,0,0,0.25)]'
            : 'shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
        } ${
          isLight
            ? 'bg-[#f4f3f8] border border-slate-300/80 text-slate-900'
            : 'bg-[#0e0e17] border border-white/10 text-white'
        } overflow-hidden font-sans`}
        style={{
          width: targetWidth,
          maxWidth: 'calc(100vw - 32px)',
          height: targetHeight,
          borderRadius: targetRadius,
          transition: isOpen
            ? 'width 340ms cubic-bezier(0.34, 1.15, 0.42, 1), height 340ms cubic-bezier(0.34, 1.15, 0.42, 1), border-radius 340ms cubic-bezier(0.34, 1.15, 0.42, 1), background-color 220ms ease, box-shadow 340ms ease'
            : 'width 280ms cubic-bezier(0.34, 1.18, 0.45, 1), height 280ms cubic-bezier(0.34, 1.18, 0.45, 1), border-radius 280ms cubic-bezier(0.34, 1.18, 0.45, 1), background-color 200ms ease, box-shadow 280ms ease',
        }}
      >
        {/* ── PILL BUTTONS (Closed State) ── */}
        <div
          className={`absolute inset-x-0 top-0 h-[40px] flex items-center justify-between px-2 transition-all ${
            !isOpen
              ? 'opacity-100 scale-100 pointer-events-auto duration-150 delay-150 ease-out'
              : 'opacity-0 scale-85 pointer-events-none duration-70 delay-0 ease-in'
          }`}
        >
          <button
            type="button"
            onClick={onToggleOpen}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.06]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.1]'
            }`}
            aria-label="Open Tuning"
            title="Tuning (T)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          <span className={`w-px h-4 mx-0.5 transition-colors duration-300 ${isLight ? 'bg-black/[0.08]' : 'bg-white/[0.08]'}`} />

          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.06]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.1]'
            }`}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            title={`${isLight ? 'Dark' : 'Light'} mode (M)`}
          >
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <svg className={`w-3.5 h-3.5 text-amber-500 absolute inset-0 transition-all duration-200 ease-out ${isLight ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-45 scale-75 pointer-events-none'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg className={`w-3.5 h-3.5 text-slate-300 absolute inset-0 transition-all duration-200 ease-out ${isLight ? 'opacity-0 rotate-45 scale-75 pointer-events-none' : 'opacity-100 rotate-0 scale-100'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </button>
        </div>

        {/* ── EXPANDED INSPECTOR CONTENT ── */}
        <div
          className={`w-full h-full flex flex-col ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          style={{
            filter: isOpen ? 'brightness(1)' : 'brightness(0)',
            transition: isOpen
              ? 'filter 200ms cubic-bezier(0, 0, 0.2, 1) 40ms, opacity 200ms cubic-bezier(0, 0, 0.2, 1) 40ms'
              : 'filter 80ms cubic-bezier(0.4, 0, 1, 1), opacity 120ms cubic-bezier(0.4, 0, 1, 1) 50ms',
          }}
        >
          {isCompact ? (
            /* COMPACT MODE */
            <div className="flex flex-col h-full overflow-hidden justify-between p-2.5">
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div
                  ref={quickPillsRef}
                  className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 min-w-0 flex-1"
                >
                  {QUICK_PROPERTIES.map((prop) => {
                    const isSelected = prop.id === selectedQuickProp;
                    return (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => setSelectedQuickProp(prop.id)}
                        className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-sm'
                            : isLight
                            ? 'bg-black/5 text-slate-500 hover:text-slate-900'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {prop.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCompact(false)}
                    className={`p-1.5 rounded-full cursor-pointer transition-all active:scale-95 ${isLight ? 'bg-black/5 text-slate-500 hover:text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    title="Expand (E)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleOpen}
                    className={`p-1.5 rounded-full cursor-pointer transition-all active:scale-95 ${isLight ? 'bg-black/5 text-slate-500 hover:text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    title="Close (T or Esc)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <SliderControl
                label={currentQuickDef.label}
                value={currentValue}
                displayValue={displayFormatted}
                min={currentQuickDef.min}
                max={currentQuickDef.max}
                step={currentQuickDef.step}
                isLight={isLight}
                enableWheel={true}
                onChange={(val) => {
                  updateField(currentQuickDef.id, val);
                }}
              />
            </div>
          ) : (
            /* EXPANDED MODE */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between p-2.5 border-b border-white/5">
                <div
                  ref={tabsRef}
                  className={`flex items-center gap-1 p-1 rounded-full overflow-x-auto no-scrollbar scroll-smooth ${isLight ? 'bg-black/5' : 'bg-white/5'}`}
                >
                  {(['beam', 'light', 'material', 'physics'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all active:scale-95 ${
                        activeTab === tab
                          ? 'bg-amber-500 text-white shadow-sm'
                          : isLight
                          ? 'text-slate-500 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab === 'beam' ? 'Light Line' : tab}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCompact(true)}
                    className={`p-1.5 rounded-full cursor-pointer transition-all active:scale-95 ${isLight ? 'bg-black/5 text-slate-500 hover:text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    title="Collapse (E)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleOpen}
                    className={`p-1.5 rounded-full cursor-pointer transition-all active:scale-95 ${isLight ? 'bg-black/5 text-slate-500 hover:text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    title="Close (T or Esc)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
                {activeTab === 'beam' && (
                  <>
                    <div className={`p-3 rounded-[18px] transition-colors duration-200 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                      <div className={`text-xs font-bold mb-2 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>Lines Count</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((count) => (
                          <button
                            key={count}
                            onClick={() => updateField('beamLines', count)}
                            className={`py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                              (settings.beamLines ?? 1) === count
                                ? 'bg-amber-500 text-white shadow-sm'
                                : isLight ? 'bg-black/5 text-slate-500 hover:text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {count} {count === 1 ? 'Line' : 'Lines'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <SliderControl
                      label="Beam Power"
                      value={settings.beamIntensity}
                      min={0}
                      max={2.5}
                      step={0.05}
                      isLight={isLight}
                      onChange={(val) => updateField('beamIntensity', val)}
                    />
                    <SliderControl
                      label="Beam Angle"
                      value={settings.beamAngle}
                      displayValue={`${Math.round((settings.beamAngle * 180) / Math.PI)}°`}
                      min={0}
                      max={3.1415}
                      step={0.05}
                      isLight={isLight}
                      onChange={(val) => updateField('beamAngle', val)}
                    />
                    <SliderControl
                      label="Line Streak (Anisotropy)"
                      value={settings.anisotropy}
                      min={0}
                      max={1}
                      step={0.05}
                      isLight={isLight}
                      onChange={(val) => updateField('anisotropy', val)}
                    />
                    <SliderControl
                      label="Beam Softness"
                      value={settings.beamSoftness}
                      displayValue={settings.beamSoftness.toFixed(1)}
                      min={1}
                      max={4}
                      step={0.1}
                      isLight={isLight}
                      onChange={(val) => updateField('beamSoftness', val)}
                    />
                  </>
                )}
                
                {activeTab === 'light' && (
                  <>
                    <div className={`p-3 rounded-[18px] transition-colors duration-200 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                      <div className={`text-xs font-bold mb-2 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>Gold Hue</div>
                      <div className="grid grid-cols-2 gap-2">
                        {GOLD_COLORS.map((item) => (
                          <button
                            key={item.hex}
                            onClick={() => updateField('goldColor', item.hex)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                              settings.goldColor.toLowerCase() === item.hex.toLowerCase()
                                ? 'bg-amber-500 text-white shadow-sm'
                                : isLight ? 'bg-black/5 text-slate-500 hover:text-slate-900' : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.hex }} />
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <SliderControl
                      label="Key Light"
                      value={settings.goldLightIntensity}
                      min={0}
                      max={3}
                      step={0.05}
                      isLight={isLight}
                      onChange={(val) => updateField('goldLightIntensity', val)}
                    />
                    <SliderControl
                      label="Ambient Fill"
                      value={settings.goldAmbientIntensity}
                      min={0}
                      max={2}
                      step={0.05}
                      isLight={isLight}
                      onChange={(val) => updateField('goldAmbientIntensity', val)}
                    />
                    <SliderControl
                      label="Env Glint"
                      value={settings.envMapIntensity}
                      min={0}
                      max={4}
                      step={0.1}
                      isLight={isLight}
                      onChange={(val) => updateField('envMapIntensity', val)}
                    />
                  </>
                )}

                {activeTab === 'material' && (
                  <>
                    <SliderControl
                      label="Corner Radius"
                      value={settings.borderRadius}
                      min={0}
                      max={0.35}
                      step={0.01}
                      isLight={isLight}
                      onChange={(val) => updateField('borderRadius', val)}
                    />
                    <SliderControl
                      label="Metalness"
                      value={settings.metalness}
                      min={0}
                      max={1}
                      step={0.01}
                      isLight={isLight}
                      onChange={(val) => updateField('metalness', val)}
                    />
                    <SliderControl
                      label="Roughness"
                      value={settings.roughness}
                      min={0}
                      max={1}
                      step={0.01}
                      isLight={isLight}
                      onChange={(val) => updateField('roughness', val)}
                    />
                    <SliderControl
                      label="Clearcoat"
                      value={settings.clearcoat}
                      min={0}
                      max={1}
                      step={0.01}
                      isLight={isLight}
                      onChange={(val) => updateField('clearcoat', val)}
                    />
                    <SliderControl
                      label="Emboss Normal"
                      value={settings.normalScale}
                      min={0}
                      max={2}
                      step={0.05}
                      isLight={isLight}
                      onChange={(val) => updateField('normalScale', val)}
                    />
                  </>
                )}

                {activeTab === 'physics' && (
                  <>
                    <SliderControl
                      label="Tilt Angle"
                      value={settings.maxTiltAngle}
                      min={0.1}
                      max={1.2}
                      step={0.02}
                      isLight={isLight}
                      onChange={(val) => updateField('maxTiltAngle', val)}
                    />
                    <SliderControl
                      label="Spring Damping"
                      value={settings.damping}
                      displayValue={settings.damping.toFixed(1)}
                      min={2}
                      max={20}
                      step={0.5}
                      isLight={isLight}
                      onChange={(val) => updateField('damping', val)}
                    />
                  </>
                )}
              </div>

              {/* Footer */}
              <div className={`p-2.5 border-t flex flex-col gap-2 transition-colors duration-200 ${isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
                <div
                  ref={presetsPillsRef}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
                >
                  <span className={`text-[11px] font-bold pl-1 pr-1 flex-shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Presets</span>
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => onChange({ ...preset.settings })}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${isLight ? 'bg-black/5 text-slate-600 hover:bg-black/10' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                      {preset.name}
                    </button>
                  ))}
                  <button
                    onClick={() => onChange({ ...DEFAULT_SETTINGS })}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${isLight ? 'bg-black/5 text-slate-600 hover:bg-black/10' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                  >
                    Reset
                  </button>
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={handleCopyJson}
                    className="flex-1 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                  >
                    {copyStatus || 'Copy Values'}
                  </button>
                  <button
                    onClick={() => setShowJsonModal(true)}
                    className={`px-4 py-1.5 rounded-full font-bold text-xs active:scale-95 transition-all ${isLight ? 'bg-black/5 text-slate-600 hover:bg-black/10' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── JSON Export Modal ── */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
          <div className={`w-full max-w-sm rounded-[32px] p-6 shadow-2xl flex flex-col gap-4 ${isLight ? 'bg-[#f4f3f8] text-slate-900 border border-slate-300/80' : 'bg-[#0e0e17] text-white border border-white/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Export Configuration</span>
              <button
                onClick={() => setShowJsonModal(false)}
                className={`p-2 rounded-full cursor-pointer transition-colors active:scale-90 ${isLight ? 'bg-black/5 text-slate-500 hover:bg-black/10' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <textarea
              ref={textAreaRef}
              readOnly
              rows={8}
              value={JSON.stringify(settings, null, 2)}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className={`w-full p-4 rounded-[20px] text-xs font-mono selection:bg-amber-400 selection:text-black focus:outline-none ${isLight ? 'bg-black/5 text-slate-800' : 'bg-white/5 text-amber-300'}`}
            />
            <button
              onClick={() => {
                if (textAreaRef.current) {
                  textAreaRef.current.select();
                  document.execCommand('copy');
                  setCopyStatus('Copied! ✓');
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
                  setTimeout(() => setCopyStatus(''), 2000);
                }
              }}
              className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              {copyStatus || 'Select All & Copy'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
