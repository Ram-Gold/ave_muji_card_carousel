import { useState, useRef } from 'react';
import type { CardSettings } from '../data/settings';
import { DEFAULT_SETTINGS, PRESETS } from '../data/settings';

interface TuningPanelProps {
  settings: CardSettings;
  onChange: (newSettings: CardSettings) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
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

export function TuningPanel({ settings, onChange, onClose, theme = 'dark' }: TuningPanelProps) {
  const [isCompact, setIsCompact] = useState<boolean>(true);
  const [selectedQuickProp, setSelectedQuickProp] = useState<QuickProperty>('beamIntensity');
  const [activeTab, setActiveTab] = useState<'beam' | 'light' | 'material' | 'physics'>('beam');
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isLight = theme === 'light';

  const updateField = <K extends keyof CardSettings>(field: K, value: CardSettings[K]) => {
    onChange({
      ...settings,
      [field]: value,
    });
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

  return (
    <>
      {/* Container */}
      <div
        className={`fixed z-40 font-sans select-none left-2 right-2 bottom-2 md:left-auto md:right-4 md:top-16 md:bottom-16 md:w-96 ${
          isLight ? 'text-slate-800' : 'text-slate-200'
        }`}
      >
        <div
          className={`rounded-2xl backdrop-blur-2xl flex flex-col overflow-hidden max-h-[50vh] md:max-h-[82vh] transition-colors duration-200 ${
            isLight
              ? 'bg-white/90 border border-black/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
              : 'bg-[#090912]/90 border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.85)]'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-3.5 py-2 border-b ${
              isLight ? 'bg-black/[0.02] border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.06]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              <span
                className={`font-mono text-[11px] tracking-wide font-semibold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Shader Inspector
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCompact((prev) => !prev)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-black/[0.05] hover:bg-black/[0.09] text-slate-600 hover:text-slate-900'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                {isCompact ? 'Expand' : 'Compact'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`p-1 rounded-md cursor-pointer transition-colors ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-800 hover:bg-black/[0.05]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
                }`}
                aria-label="Close"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* COMPACT MODE */}
          {isCompact ? (
            <div className="p-3 space-y-2">
              {/* Quick Chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                {QUICK_PROPERTIES.map((prop) => {
                  const isSelected = prop.id === selectedQuickProp;
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => setSelectedQuickProp(prop.id)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-amber-500 text-white font-semibold shadow-sm'
                          : isLight
                          ? 'bg-black/[0.05] text-slate-600 hover:text-slate-900 hover:bg-black/[0.09]'
                          : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
                      }`}
                    >
                      {prop.label}
                    </button>
                  );
                })}
              </div>

              {/* Slider Row */}
              <div
                className={`p-2.5 rounded-xl border space-y-1.5 ${
                  isLight ? 'bg-slate-100/80 border-black/[0.06]' : 'bg-black/30 border-white/[0.06]'
                }`}
              >
                <div className="flex justify-between items-center font-mono text-[11px]">
                  <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium'}>
                    {currentQuickDef.label}
                  </span>
                  <span className="text-amber-500 font-bold">{displayFormatted}</span>
                </div>

                <input
                  type="range"
                  min={currentQuickDef.min}
                  max={currentQuickDef.max}
                  step={currentQuickDef.step}
                  value={currentValue}
                  onChange={(e) => updateField(currentQuickDef.id, parseFloat(e.target.value))}
                  className="w-full h-4 cursor-pointer"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => onChange({ ...PRESETS.singleBeam.settings })}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-black/[0.05] hover:bg-black/[0.09] text-amber-700 font-medium'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-amber-300/80'
                    }`}
                  >
                    1 Line
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...PRESETS.horizontalLaser.settings })}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-black/[0.05] hover:bg-black/[0.09] text-amber-700 font-medium'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-amber-300/80'
                    }`}
                  >
                    Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...DEFAULT_SETTINGS })}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-black/[0.05] hover:bg-black/[0.09] text-slate-600'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400'
                    }`}
                  >
                    Reset
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-[10px] font-mono cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  <span>{copyStatus || 'Copy Values'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* FULL EXPANDED MODE */
            <>
              {/* Presets Row */}
              <div
                className={`px-3.5 py-1.5 border-b flex flex-wrap gap-1 items-center text-[10px] font-mono ${
                  isLight ? 'border-black/[0.06] bg-slate-50' : 'border-white/[0.04] bg-black/20'
                }`}
              >
                <span
                  className={`uppercase tracking-wider text-[9px] mr-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  Presets:
                </span>
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ ...preset.settings })}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-black/[0.05] hover:bg-black/[0.09] text-amber-800 font-medium'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-amber-300/90'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onChange({ ...DEFAULT_SETTINGS })}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    isLight
                      ? 'bg-black/[0.05] hover:bg-black/[0.09] text-slate-600'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400'
                  }`}
                >
                  Reset
                </button>
              </div>

              {/* Tabs */}
              <div
                className={`flex border-b px-3 pt-1 overflow-x-auto no-scrollbar ${
                  isLight ? 'border-black/[0.06] bg-black/[0.01]' : 'border-white/[0.06] bg-white/[0.01]'
                }`}
              >
                {(['beam', 'light', 'material', 'physics'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-1.5 px-3 text-[11px] font-mono cursor-pointer border-b-2 transition-all capitalize ${
                      activeTab === tab
                        ? isLight
                          ? 'border-amber-500 text-amber-600 font-bold'
                          : 'border-amber-400 text-amber-300 font-semibold'
                        : isLight
                        ? 'border-transparent text-slate-500 hover:text-slate-800'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'beam' ? 'Light Line' : tab}
                  </button>
                ))}
              </div>

              {/* Sliders Content */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                {activeTab === 'beam' && (
                  <>
                    <div className="space-y-1">
                      <div className={`font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Lines Count
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[1, 2, 3].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => updateField('beamLines', count)}
                            className={`py-1 rounded-md text-[10px] font-mono cursor-pointer border transition-all ${
                              (settings.beamLines ?? 1) === count
                                ? isLight
                                  ? 'border-amber-500 bg-amber-500/15 text-amber-800 font-bold'
                                  : 'border-amber-400 bg-amber-400/20 text-white font-semibold'
                                : isLight
                                ? 'border-black/[0.08] bg-black/[0.03] text-slate-600 hover:bg-black/[0.06]'
                                : 'border-white/[0.06] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                            }`}
                          >
                            {count} {count === 1 ? 'Line' : 'Lines'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Beam Intensity</span>
                        <span className="text-amber-500 font-semibold">{settings.beamIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2.5"
                        step="0.05"
                        value={settings.beamIntensity}
                        onChange={(e) => updateField('beamIntensity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Beam Angle</span>
                        <span className="text-amber-500 font-semibold">
                          {Math.round((settings.beamAngle * 180) / Math.PI)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3.1415"
                        step="0.05"
                        value={settings.beamAngle}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateField('beamAngle', val);
                          updateField('anisotropyRotation', val);
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Line Streak (Anisotropy)</span>
                        <span className="text-amber-500 font-semibold">{settings.anisotropy.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.anisotropy}
                        onChange={(e) => updateField('anisotropy', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Beam Softness</span>
                        <span className="text-amber-500 font-semibold">{settings.beamSoftness.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="0.1"
                        value={settings.beamSoftness}
                        onChange={(e) => updateField('beamSoftness', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'light' && (
                  <>
                    <div className="space-y-1.5">
                      <div className={`font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Gold Hue
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {GOLD_COLORS.map((item) => (
                          <button
                            key={item.hex}
                            type="button"
                            onClick={() => updateField('goldColor', item.hex)}
                            className={`flex items-center gap-1.5 p-1 rounded-md border text-[10px] font-mono cursor-pointer transition-all ${
                              settings.goldColor.toLowerCase() === item.hex.toLowerCase()
                                ? isLight
                                  ? 'border-amber-500 bg-amber-500/15 text-amber-800 font-bold'
                                  : 'border-amber-400 bg-amber-400/20 text-white font-semibold'
                                : isLight
                                ? 'border-black/[0.08] bg-black/[0.03] text-slate-600 hover:bg-black/[0.06]'
                                : 'border-white/[0.06] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.hex }} />
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Key Light</span>
                        <span className="text-amber-500 font-semibold">{settings.goldLightIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.05"
                        value={settings.goldLightIntensity}
                        onChange={(e) => updateField('goldLightIntensity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Ambient Fill</span>
                        <span className="text-amber-500 font-semibold">{settings.goldAmbientIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={settings.goldAmbientIntensity}
                        onChange={(e) => updateField('goldAmbientIntensity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Env Glint</span>
                        <span className="text-amber-500 font-semibold">{settings.envMapIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="0.1"
                        value={settings.envMapIntensity}
                        onChange={(e) => updateField('envMapIntensity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'material' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Corner Radius</span>
                        <span className="text-amber-500 font-semibold">{settings.borderRadius.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.35"
                        step="0.01"
                        value={settings.borderRadius}
                        onChange={(e) => updateField('borderRadius', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Metalness</span>
                        <span className="text-amber-500 font-semibold">{settings.metalness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={settings.metalness}
                        onChange={(e) => updateField('metalness', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Roughness</span>
                        <span className="text-amber-500 font-semibold">{settings.roughness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={settings.roughness}
                        onChange={(e) => updateField('roughness', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Clearcoat</span>
                        <span className="text-amber-500 font-semibold">{settings.clearcoat.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={settings.clearcoat}
                        onChange={(e) => updateField('clearcoat', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Emboss Normal</span>
                        <span className="text-amber-500 font-semibold">{settings.normalScale.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={settings.normalScale}
                        onChange={(e) => updateField('normalScale', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'physics' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Tilt Angle</span>
                        <span className="text-amber-500 font-semibold">{settings.maxTiltAngle.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.2"
                        step="0.02"
                        value={settings.maxTiltAngle}
                        onChange={(e) => updateField('maxTiltAngle', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Spring Damping</span>
                        <span className="text-amber-500 font-semibold">{settings.damping.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="0.5"
                        value={settings.damping}
                        onChange={(e) => updateField('damping', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                className={`p-3 border-t flex items-center gap-2 ${
                  isLight ? 'border-black/[0.06] bg-slate-50' : 'border-white/[0.06] bg-black/30'
                }`}
              >
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs font-mono cursor-pointer shadow-sm text-center active:scale-95 transition-all"
                >
                  {copyStatus || 'Copy Values JSON'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowJsonModal(true)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    isLight
                      ? 'bg-black/[0.05] hover:bg-black/[0.1] text-slate-700'
                      : 'bg-white/[0.06] hover:bg-white/[0.10] text-slate-300'
                  }`}
                >
                  JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className={`w-full max-w-sm border rounded-2xl p-4 shadow-2xl flex flex-col gap-3 font-mono ${
              isLight ? 'bg-white border-black/[0.12] text-slate-800' : 'bg-[#0c0c16] border-white/[0.12] text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-500 font-semibold">Export Configuration</span>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                ✕
              </button>
            </div>

            <textarea
              ref={textAreaRef}
              readOnly
              rows={8}
              value={JSON.stringify(settings, null, 2)}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className={`w-full p-2.5 rounded-xl border text-[11px] font-mono selection:bg-amber-400 selection:text-black focus:outline-none ${
                isLight
                  ? 'bg-slate-50 border-black/[0.1] text-slate-800'
                  : 'bg-black/50 border-white/[0.08] text-amber-300'
              }`}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (textAreaRef.current) {
                    textAreaRef.current.select();
                    document.execCommand('copy');
                    setCopyStatus('Copied! ✓');
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(15);
                    }
                    setTimeout(() => setCopyStatus(''), 2000);
                  }
                }}
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs cursor-pointer text-center active:scale-95 transition-all"
              >
                {copyStatus || 'Select All & Copy'}
              </button>

              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-black/[0.06] text-slate-700 hover:bg-black/[0.1]'
                    : 'bg-white/[0.08] text-slate-300 hover:bg-white/[0.12]'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
