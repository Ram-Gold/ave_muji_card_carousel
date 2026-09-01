export interface CardSettings {
  // PBR Material Properties
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  normalScale: number;
  envMapIntensity: number;
  opacity: number;
  reflectivity: number;
  ior: number;
  borderRadius: number;
  anisotropy: number;
  anisotropyRotation: number;

  // Light Beam / Line Configurations
  beamLines: number; // 1 = Single Line, 2 = Double Line, 3 = Triple Line
  beamIntensity: number;
  beamSpread: number;
  beamAngle: number;
  beamSoftness: number;

  // Scene & Gold Lighting
  goldColor: string;
  goldLightIntensity: number;
  goldAmbientIntensity: number;
  specularFollowIntensity: number;
  specularDistance: number;

  // Motion & Physics
  maxTiltAngle: number;
  damping: number;
  liftZ: number;
}

export const DEFAULT_SETTINGS: CardSettings = {
  metalness: 0.44,
  roughness: 0.33,
  clearcoat: 0,
  clearcoatRoughness: 0.12,
  normalScale: 0.1,
  envMapIntensity: 0,
  opacity: 1,
  reflectivity: 0.9,
  ior: 1.5,
  borderRadius: 0.12,
  anisotropy: 0.85,
  anisotropyRotation: 0.7,

  // Light beam
  beamLines: 1,
  beamIntensity: 2.05,
  beamSpread: 0.6,
  beamAngle: 0.75,
  beamSoftness: 2.2,

  // Gold lighting
  goldColor: '#ffd700',
  goldLightIntensity: 2.45,
  goldAmbientIntensity: 1.65,
  specularFollowIntensity: 2.2,
  specularDistance: 7,

  // Tilt physics
  maxTiltAngle: 0.82,
  damping: 9,
  liftZ: 0.32,
};

export interface Preset {
  name: string;
  description: string;
  settings: CardSettings;
}

export const PRESETS: Record<string, Preset> = {
  singleBeam: {
    name: 'Single Crisp Beam (45°)',
    description: 'One single, elegant diagonal beam of light sweeping cleanly across the card',
    settings: {
      metalness: 0,
      roughness: 0.55,
      clearcoat: 0.02,
      clearcoatRoughness: 0.12,
      normalScale: 0.55,
      envMapIntensity: 0.8,
      opacity: 1.0,
      reflectivity: 0.9,
      ior: 1.5,
      borderRadius: 0.12,
      anisotropy: 0.85,
      anisotropyRotation: 0.785,
      beamLines: 1,
      beamIntensity: 0.9,
      beamSpread: 0.6,
      beamAngle: 0.785,
      beamSoftness: 2.2,
      goldColor: '#ffd700',
      goldLightIntensity: 0.45,
      goldAmbientIntensity: 0.75,
      specularFollowIntensity: 2.2,
      specularDistance: 7.0,
      maxTiltAngle: 0.44,
      damping: 9.0,
      liftZ: 0.32,
    },
  },
  horizontalLaser: {
    name: 'Horizontal Beam (0°)',
    description: 'Single horizontal light beam that sweeps up and down with tilt',
    settings: {
      metalness: 0.05,
      roughness: 0.5,
      clearcoat: 0.15,
      clearcoatRoughness: 0.15,
      normalScale: 0.55,
      envMapIntensity: 0.9,
      opacity: 1.0,
      reflectivity: 0.9,
      ior: 1.5,
      borderRadius: 0.12,
      anisotropy: 0.9,
      anisotropyRotation: 0,
      beamLines: 1,
      beamIntensity: 1.0,
      beamSpread: 0.6,
      beamAngle: 0,
      beamSoftness: 2.2,
      goldColor: '#ffd700',
      goldLightIntensity: 0.45,
      goldAmbientIntensity: 0.75,
      specularFollowIntensity: 2.2,
      specularDistance: 7.0,
      maxTiltAngle: 0.44,
      damping: 9.0,
      liftZ: 0.32,
    },
  },
  doubleBeam: {
    name: 'Dual Holographic Lines',
    description: 'Two parallel light lines gliding across the surface',
    settings: {
      metalness: 0.1,
      roughness: 0.45,
      clearcoat: 0.2,
      clearcoatRoughness: 0.1,
      normalScale: 0.6,
      envMapIntensity: 1.0,
      opacity: 1.0,
      reflectivity: 0.95,
      ior: 1.5,
      borderRadius: 0.12,
      anisotropy: 0.8,
      anisotropyRotation: 0.785,
      beamLines: 2,
      beamIntensity: 0.8,
      beamSpread: 0.8,
      beamAngle: 0.785,
      beamSoftness: 2.0,
      goldColor: '#ffd700',
      goldLightIntensity: 0.45,
      goldAmbientIntensity: 0.75,
      specularFollowIntensity: 2.0,
      specularDistance: 7.0,
      maxTiltAngle: 0.48,
      damping: 9.0,
      liftZ: 0.32,
    },
  },
};
