import dolorisAlbedo from '../assets/doloris/doloris.png';
import dolorisNormal from '../assets/doloris/doloris-normal-map.png';
import dolorisRoughness from '../assets/doloris/doloris-roughness-map.png';

import amorisAlbedo from '../assets/amoris/amoris.png';
import amorisNormal from '../assets/amoris/amoris-normal-map.png';
import amorisRoughness from '../assets/amoris/amoris-roughness-map.png';

import mortisAlbedo from '../assets/mortis/mortis.png';
import mortisNormal from '../assets/mortis/mortis-normal-map.png';
import mortisRoughness from '../assets/mortis/mortis-roughness-map.png';

import oblivionisAlbedo from '../assets/oblivionis/oblivionis.png';
import oblivionisNormal from '../assets/oblivionis/oblivionis-normal-map.png';
import oblivionisRoughness from '../assets/oblivionis/oblivionis-roughness-map.png';

import timorisAlbedo from '../assets/timoris/timoris.png';
import timorisNormal from '../assets/timoris/timoris-normal-map.png';
import timorisRoughness from '../assets/timoris/timoris-roughness-map.png';

import cardBack from '../assets/card-back/card_back.png';
import cardBackNormal from '../assets/card-back/card-back-normal-map.png';
import cardBackRoughness from '../assets/card-back/card-back-roughness-map.png';
import { useTexture } from '@react-three/drei';

// Preload all textures for instant, smooth card switching
try {
  useTexture.preload([
    dolorisAlbedo,
    dolorisNormal,
    dolorisRoughness,
    amorisAlbedo,
    amorisNormal,
    amorisRoughness,
    mortisAlbedo,
    mortisNormal,
    mortisRoughness,
    oblivionisAlbedo,
    oblivionisNormal,
    oblivionisRoughness,
    timorisAlbedo,
    timorisNormal,
    timorisRoughness,
    cardBack,
    cardBackNormal,
    cardBackRoughness,
  ]);
} catch {
  // Graceful fallback if invoked outside browser context
}

export type CardStatus = 'ready' | 'in_preparation';

export interface CardData {
  id: string;
  name: string;
  codename: string;
  characterJa: string;
  characterEn: string;
  role: string;
  themeColor: string;
  glowColor: string;
  albedo: string;
  normal?: string;
  roughness?: string;
  back: string;
  backNormal?: string;
  backRoughness?: string;
  quote: string;
  description: string;
  status?: CardStatus;
  arcanaNum?: string;
}

export const AVE_MUJICA_CARDS: CardData[] = [
  {
    id: 'doloris',
    name: 'Doloris',
    codename: 'DOLORIS',
    characterJa: '三角 初華',
    characterEn: 'Uika Misumi',
    role: 'Guitar & Lead Vocal',
    themeColor: '#4f75ff',
    glowColor: 'rgba(79, 117, 255, 0.45)',
    albedo: dolorisAlbedo,
    normal: dolorisNormal,
    roughness: dolorisRoughness,
    back: cardBack,
    backNormal: cardBackNormal,
    backRoughness: cardBackRoughness,
    quote: '「悲哀の中で歌う、銀翼のカナリア」',
    description: 'Carrying the name of Sorrow, the canary who sings lamentations draped in moonlight and silver feathers.',
    status: 'ready',
    arcanaNum: 'I',
  },
  {
    id: 'amoris',
    name: 'Amoris',
    codename: 'AMORIS',
    characterJa: '豊川 祥子',
    characterEn: 'Sakiko Togawa',
    role: 'Keyboard & Producer',
    themeColor: '#9333ea',
    glowColor: 'rgba(147, 51, 234, 0.45)',
    albedo: amorisAlbedo,
    normal: amorisNormal,
    roughness: amorisRoughness,
    back: cardBack,
    backNormal: cardBackNormal,
    backRoughness: cardBackRoughness,
    quote: '「運命を創り変える、禁断の愛の指揮者」',
    description: 'Bearing the name of Love, the visionary composer sculpting destiny through theatrical dissonance.',
    status: 'ready',
    arcanaNum: 'II',
  },
  {
    id: 'mortis',
    name: 'Mortis',
    codename: 'MORTIS',
    characterJa: '八幡 海鈴',
    characterEn: 'Umiri Yahata',
    role: 'Bass',
    themeColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.45)',
    albedo: mortisAlbedo,
    normal: mortisNormal,
    roughness: mortisRoughness,
    back: cardBack,
    backNormal: cardBackNormal,
    backRoughness: cardBackRoughness,
    quote: '「終焉を刻む、絶対の拍動」',
    description: 'Bearing the name of Death, providing the unshakeable low-end pulse that anchors mortality and truth.',
    status: 'ready',
    arcanaNum: 'XIII',
  },
  {
    id: 'oblivionis',
    name: 'Oblivionis',
    codename: 'OBLIVIONIS',
    characterJa: '若葉 睦',
    characterEn: 'Mutsumi Wakaba',
    role: 'Guitar',
    themeColor: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.45)',
    albedo: oblivionisAlbedo,
    normal: oblivionisNormal,
    roughness: oblivionisRoughness,
    back: cardBack,
    backNormal: cardBackNormal,
    backRoughness: cardBackRoughness,
    quote: '「忘却の淵に咲く、蒼翠の薔薇」',
    description: 'Bearing the name of Oblivion, wielding sharp and evocative guitar lines born from unspoken quietude.',
    status: 'ready',
    arcanaNum: 'XX',
  },
  {
    id: 'timoris',
    name: 'Timoris',
    codename: 'TIMORIS',
    characterJa: '祐天寺 にゃむ',
    characterEn: 'Nyamu Yūtenji',
    role: 'Drums',
    themeColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    albedo: timorisAlbedo,
    normal: timorisNormal,
    roughness: timorisRoughness,
    back: cardBack,
    backNormal: cardBackNormal,
    backRoughness: cardBackRoughness,
    quote: '「畏怖と熱狂を操る、仮面の鼓動」',
    description: 'Bearing the name of Fear, orchestrating relentless rhythmic power behind an intoxicating digital charisma.',
    status: 'ready',
    arcanaNum: 'XI',
  },
];
