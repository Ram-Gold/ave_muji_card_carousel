import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import type { CardData } from '../data/cards';
import type { CardSettings } from '../data/settings';

interface TarotCardProps {
  card: CardData;
  settings: CardSettings;
  isFlipped: boolean;
  isTuningOpen?: boolean;
  onFlip?: () => void;
}

function createRoundedRectShape(w: number, h: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.max(0.001, Math.min(r, w / 2, h / 2));

  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  shape.closePath();
  return shape;
}

function createRoundedCardGeometry(w: number, h: number, r: number, curveSegments = 24) {
  const shape = createRoundedRectShape(w, h, r);
  const geometry = new THREE.ShapeGeometry(shape, curveSegments);
  const pos = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  // Normalize UV coordinates precisely to [0, 1] range for texture mapping
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = (x + w / 2) / w;
    const v = (y + h / 2) / h;
    uvs.setXY(i, u, v);
  }
  uvs.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}



const pbrCache = new Map<string, { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture }>();

function generateProceduralPBR(image: HTMLImageElement | HTMLCanvasElement, normalScale = 1.5) {
  try {
    const w = image.width || (image as any).naturalWidth || 512;
    const h = image.height || (image as any).naturalHeight || 512;

    const targetW = Math.min(w, 1024);
    const targetH = Math.min(h, 1024);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const src = imgData.data;

    // 1. Luminance
    const lum = new Float32Array(targetW * targetH);
    for (let i = 0; i < src.length; i += 4) {
      const r = src[i] / 255;
      const g = src[i + 1] / 255;
      const b = src[i + 2] / 255;
      lum[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // 2. Normal Canvas
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = targetW;
    normalCanvas.height = targetH;
    const normCtx = normalCanvas.getContext('2d')!;
    const normImgData = normCtx.createImageData(targetW, targetH);
    const normData = normImgData.data;

    // 3. Roughness Canvas
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = targetW;
    roughCanvas.height = targetH;
    const roughCtx = roughCanvas.getContext('2d')!;
    const roughImgData = roughCtx.createImageData(targetW, targetH);
    const roughData = roughImgData.data;

    const strength = normalScale * 3.8;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const idx = y * targetW + x;
        const pixelIdx = idx * 4;

        const x0 = Math.max(0, x - 1);
        const x1 = Math.min(targetW - 1, x + 1);
        const y0 = Math.max(0, y - 1);
        const y1 = Math.min(targetH - 1, y + 1);

        const lTL = lum[y0 * targetW + x0];
        const lT  = lum[y0 * targetW + x];
        const lTR = lum[y0 * targetW + x1];
        const lL  = lum[y * targetW + x0];
        const lR  = lum[y * targetW + x1];
        const lBL = lum[y1 * targetW + x0];
        const lB  = lum[y1 * targetW + x];
        const lBR = lum[y1 * targetW + x1];

        const dx = (lTR + 2 * lR + lBR) - (lTL + 2 * lL + lBL);
        const dy = (lBL + 2 * lB + lBR) - (lTL + 2 * lT + lTR);

        const nx = -dx * strength;
        const ny = -dy * strength;
        const nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1.0;

        normData[pixelIdx]     = Math.round(((nx / len) * 0.5 + 0.5) * 255);
        normData[pixelIdx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
        normData[pixelIdx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
        normData[pixelIdx + 3] = 255;

        const l = lum[idx];
        const goldFactor = Math.pow(l, 1.3);
        const roughVal = Math.round(Math.max(25, Math.min(245, 230 - goldFactor * 195)));

        roughData[pixelIdx]     = roughVal;
        roughData[pixelIdx + 1] = roughVal;
        roughData[pixelIdx + 2] = roughVal;
        roughData[pixelIdx + 3] = 255;
      }
    }

    normCtx.putImageData(normImgData, 0, 0);
    roughCtx.putImageData(roughImgData, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
    normalTexture.colorSpace = THREE.NoColorSpace;
    roughnessTexture.colorSpace = THREE.NoColorSpace;
    normalTexture.needsUpdate = true;
    roughnessTexture.needsUpdate = true;

    return { normalMap: normalTexture, roughnessMap: roughnessTexture };
  } catch {
    return null;
  }
}

interface CardFaceProps {
  albedo: string;
  normal?: string;
  roughness?: string;
  settings: CardSettings;
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
}

function CardFace({
  albedo,
  normal,
  roughness,
  settings,
  geometry,
  position,
  rotation = [0, 0, 0],
}: CardFaceProps) {
  const texturesToLoad = [albedo];
  if (normal) texturesToLoad.push(normal);
  if (roughness) texturesToLoad.push(roughness);

  const loaded = useTexture(texturesToLoad);
  const albedoMap = Array.isArray(loaded) ? loaded[0] : loaded;
  const explicitNormalMap = normal ? (Array.isArray(loaded) ? loaded[1] : undefined) : undefined;
  const explicitRoughnessMap = roughness ? (Array.isArray(loaded) ? (normal ? loaded[2] : loaded[1]) : undefined) : undefined;

  albedoMap.colorSpace = THREE.SRGBColorSpace;
  if (explicitNormalMap) explicitNormalMap.colorSpace = THREE.NoColorSpace;
  if (explicitRoughnessMap) explicitRoughnessMap.colorSpace = THREE.NoColorSpace;

  const proceduralPBR = useMemo(() => {
    if (explicitNormalMap && explicitRoughnessMap) return null;
    if (pbrCache.has(albedo)) return pbrCache.get(albedo)!;
    if (albedoMap?.image) {
      const generated = generateProceduralPBR(albedoMap.image as HTMLImageElement);
      if (generated) {
        pbrCache.set(albedo, generated);
        return generated;
      }
    }
    return null;
  }, [albedo, albedoMap?.image, explicitNormalMap, explicitRoughnessMap]);

  const activeNormalMap = explicitNormalMap || proceduralPBR?.normalMap;
  const activeRoughnessMap = explicitRoughnessMap || proceduralPBR?.roughnessMap;

  const anisotropyAngle = settings.beamAngle ?? settings.anisotropyRotation ?? 0.785;

  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <meshPhysicalMaterial
        map={albedoMap}
        normalMap={activeNormalMap}
        normalScale={activeNormalMap ? new THREE.Vector2(settings.normalScale, settings.normalScale) : undefined}
        roughnessMap={activeRoughnessMap}
        metalness={settings.metalness}
        roughness={settings.roughness}
        clearcoat={settings.clearcoat}
        clearcoatRoughness={settings.clearcoatRoughness}
        anisotropy={settings.anisotropy ?? 0.85}
        anisotropyRotation={anisotropyAngle}
        envMapIntensity={settings.envMapIntensity}
        opacity={settings.opacity}
        transparent={settings.opacity < 1}
        reflectivity={settings.reflectivity}
        ior={settings.ior ?? 1.5}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

export function TarotCard({ card, settings, isFlipped, isTuningOpen, onFlip }: TarotCardProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const lightBarRef = useRef<THREE.Group>(null!);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Double tap / double click detection refs
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownInfoRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const lastFlipTimeRef = useRef<number>(0);

  const triggerFlip = () => {
    const now = performance.now();
    // Guard against duplicate triggers (e.g. pointerup double-tap + browser dblclick event)
    if (now - lastFlipTimeRef.current < 400) {
      return;
    }
    lastFlipTimeRef.current = now;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(14);
    }
    onFlip?.();
  };

  const { viewport, size } = useThree();
  const isPortrait = size.height > size.width;

  // Zoomed-out adaptive scale
  const baseScale = isPortrait
    ? (isTuningOpen ? Math.min(viewport.width / 3.8, viewport.height / 7.2, 0.78) : Math.min(viewport.width / 3.6, viewport.height / 6.2, 0.88))
    : Math.min(viewport.width / 5.5, viewport.height / 4.8, 0.95);

  const basePosY = isPortrait ? (isTuningOpen ? 0.6 : 0.32) : 0;

  // Memoized rounded geometries
  const faceGeometry = useMemo(() => {
    return createRoundedCardGeometry(2.6, 3.742, settings.borderRadius || 0.12, 24);
  }, [settings.borderRadius]);

  const bodyGeometry = useMemo(() => {
    const shape = createRoundedRectShape(2.605, 3.747, settings.borderRadius || 0.12);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.038,
      bevelEnabled: false,
      curveSegments: 24,
    });
    geom.center();
    return geom;
  }, [settings.borderRadius]);

  useCursor(isHovered, 'pointer', 'auto');

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const px = state.pointer.x;
    const py = state.pointer.y;
    const t = state.clock.elapsedTime;
    const baseRotationY = isFlipped ? Math.PI : 0;
    const isPointerActive = Math.abs(px) > 0.001 || Math.abs(py) > 0.001;

    const maxAngle = settings.maxTiltAngle;
    const dampSpeed = settings.damping;
    const liftZ = settings.liftZ;

    if (isHovered || isDragging) {
      // Dynamic tilt following pointer
      const targetRotX = -py * maxAngle;
      const targetRotY = baseRotationY + (isFlipped ? -px * maxAngle : px * maxAngle);
      const targetRotZ = -px * (maxAngle * 0.12);
      const targetPosZ = liftZ;
      const targetScale = baseScale * 1.035;

      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, dampSpeed, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, dampSpeed, delta);
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetRotZ, dampSpeed, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetPosZ, dampSpeed * 0.9, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, basePosY, dampSpeed * 0.9, delta);

      const currentScale = groupRef.current.scale.x;
      const newScale = THREE.MathUtils.damp(currentScale, targetScale, dampSpeed * 0.9, delta);
      groupRef.current.scale.set(newScale, newScale, newScale);

      // Sweep linear light beam across the card
      if (lightBarRef.current) {
        lightBarRef.current.position.x = THREE.MathUtils.damp(lightBarRef.current.position.x, px * 3.2, 10, delta);
        lightBarRef.current.position.y = THREE.MathUtils.damp(lightBarRef.current.position.y, py * 4.2, 10, delta);
        lightBarRef.current.position.z = 2.5;
      }
    } else {
      // Idle float & subtle tracking
      const idleRotX = Math.sin(t * 1.3) * 0.035;
      const idleRotY = Math.cos(t * 1.0) * 0.035;
      const idleRotZ = Math.sin(t * 0.8) * 0.015;
      const idlePosY = basePosY + Math.sin(t * 1.6) * 0.06;

      const targetRotX = (isPointerActive ? -py * (maxAngle * 0.5) : 0) + idleRotX;
      const targetRotY = baseRotationY + (isPointerActive ? (isFlipped ? -px * (maxAngle * 0.5) : px * (maxAngle * 0.5)) : 0) + idleRotY;
      const targetRotZ = (isPointerActive ? -px * 0.035 : 0) + idleRotZ;

      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, dampSpeed * 0.7, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, dampSpeed * 0.7, delta);
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetRotZ, dampSpeed * 0.7, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, 0, dampSpeed * 0.7, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, idlePosY, dampSpeed * 0.7, delta);

      const currentScale = groupRef.current.scale.x;
      const newScale = THREE.MathUtils.damp(currentScale, baseScale, dampSpeed * 0.7, delta);
      groupRef.current.scale.set(newScale, newScale, newScale);

      if (lightBarRef.current) {
        lightBarRef.current.position.x = THREE.MathUtils.damp(lightBarRef.current.position.x, Math.sin(t * 1.5) * 1.2, 5, delta);
        lightBarRef.current.position.y = THREE.MathUtils.damp(lightBarRef.current.position.y, Math.cos(t * 1.2) * 1.6, 5, delta);
        lightBarRef.current.position.z = 2.5;
      }
    }
  });

  const beamIntensityFactor = (settings.beamIntensity ?? 0.9);
  const baseFollow = isHovered || isDragging
    ? settings.specularFollowIntensity
    : settings.specularFollowIntensity * 0.45;
  const activeBeamIntensity = baseFollow * beamIntensityFactor;

  const beamSpread = settings.beamSpread ?? 0.6;
  const beamAngle = settings.beamAngle ?? 0.785;
  const beamDecay = settings.beamSoftness ?? 2.2;
  const beamLines = settings.beamLines ?? 1;

  return (
    <>
      {/* Configurable Light Beam: 1 Single Crisp Beam by default, or optional Multi-Beam */}
      <group ref={lightBarRef} position={[0, 0, 2.5]} rotation={[0, 0, beamAngle]}>
        {beamLines === 1 ? (
          /* EXACTLY 1 UNIFIED POINT LIGHT (Rendered into a single clean line by Anisotropy shader) */
          <pointLight
            position={[0, 0, 0]}
            intensity={activeBeamIntensity * 1.2}
            color={settings.goldColor}
            distance={settings.specularDistance}
            decay={beamDecay}
          />
        ) : beamLines === 2 ? (
          /* Dual Parallel Lines */
          <>
            <pointLight
              position={[-beamSpread * 0.6, 0, 0]}
              intensity={activeBeamIntensity * 0.85}
              color={settings.goldColor}
              distance={settings.specularDistance}
              decay={beamDecay}
            />
            <pointLight
              position={[beamSpread * 0.6, 0, 0]}
              intensity={activeBeamIntensity * 0.85}
              color={settings.goldColor}
              distance={settings.specularDistance}
              decay={beamDecay}
            />
          </>
        ) : (
          /* Triple Lines */
          <>
            <pointLight
              position={[-beamSpread * 0.9, 0, 0]}
              intensity={activeBeamIntensity * 0.55}
              color={settings.goldColor}
              distance={settings.specularDistance}
              decay={beamDecay}
            />
            <pointLight
              position={[0, 0, 0]}
              intensity={activeBeamIntensity * 0.9}
              color={settings.goldColor}
              distance={settings.specularDistance}
              decay={beamDecay}
            />
            <pointLight
              position={[beamSpread * 0.9, 0, 0]}
              intensity={activeBeamIntensity * 0.55}
              color={settings.goldColor}
              distance={settings.specularDistance}
              decay={beamDecay}
            />
          </>
        )}
      </group>

      <group
        ref={groupRef}
        scale={baseScale}
        position={[0, basePosY, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true);
          pointerDownInfoRef.current = {
            time: performance.now(),
            x: e.clientX,
            y: e.clientY,
          };
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setIsDragging(false);

          const now = performance.now();
          const pressDuration = now - pointerDownInfoRef.current.time;
          const moveDist = Math.hypot(
            e.clientX - pointerDownInfoRef.current.x,
            e.clientY - pointerDownInfoRef.current.y
          );

          // If this was a quick tap rather than a long drag
          if (pressDuration < 400 && moveDist < 40) {
            const timeSinceLastTap = now - lastTapTimeRef.current;
            const tapGap = Math.hypot(
              e.clientX - lastTapPosRef.current.x,
              e.clientY - lastTapPosRef.current.y
            );

            // Double tap recognized: 2 taps within 450ms and within reasonable distance
            if (timeSinceLastTap > 30 && timeSinceLastTap < 450 && tapGap < 80) {
              lastTapTimeRef.current = 0;
              triggerFlip();
            } else {
              lastTapTimeRef.current = now;
              lastTapPosRef.current = { x: e.clientX, y: e.clientY };
            }
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          triggerFlip();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setIsHovered(false);
          setIsDragging(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Rounded Card Rim / Solid Body with metallic gold accent */}
        <mesh geometry={bodyGeometry}>
          <meshStandardMaterial
            color="#14121a"
            metalness={0.95}
            roughness={0.18}
            emissive={settings.goldColor}
            emissiveIntensity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Rounded Front Face */}
        <CardFace
          albedo={card.albedo}
          normal={card.normal}
          roughness={card.roughness}
          settings={settings}
          geometry={faceGeometry}
          position={[0, 0, 0.02]}
          rotation={[0, 0, 0]}
        />

        {/* Rounded Back Face (matches preparation card front face in lighting and geometry) */}
        <CardFace
          albedo={card.back}
          normal={card.backNormal}
          roughness={card.backRoughness}
          settings={settings}
          geometry={faceGeometry}
          position={[0, 0, -0.02]}
          rotation={[0, Math.PI, 0]}
        />
      </group>
    </>
  );
}
