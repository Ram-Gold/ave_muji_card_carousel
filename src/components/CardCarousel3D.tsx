import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { AVE_MUJICA_CARDS } from '../data/cards';
import type { CardData } from '../data/cards';
import type { CardSettings } from '../data/settings';

interface CardCarousel3DProps {
  selectedCardId: string;
  onSelectCard: (id: string) => void;
  settings: CardSettings;
  isFlipped: boolean;
  isTuningOpen?: boolean;
  onFlip?: () => void;
  gyro?: { x: number; y: number; active: boolean };
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

    const lum = new Float32Array(targetW * targetH);
    for (let i = 0; i < src.length; i += 4) {
      const r = src[i] / 255;
      const g = src[i + 1] / 255;
      const b = src[i + 2] / 255;
      lum[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = targetW;
    normalCanvas.height = targetH;
    const normCtx = normalCanvas.getContext('2d')!;
    const normImgData = normCtx.createImageData(targetW, targetH);
    const normData = normImgData.data;

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
        const lT = lum[y0 * targetW + x];
        const lTR = lum[y0 * targetW + x1];
        const lL = lum[y * targetW + x0];
        const lR = lum[y * targetW + x1];
        const lBL = lum[y1 * targetW + x0];
        const lB = lum[y1 * targetW + x];
        const lBR = lum[y1 * targetW + x1];

        const dx = lTR + 2 * lR + lBR - (lTL + 2 * lL + lBL);
        const dy = lBL + 2 * lB + lBR - (lTL + 2 * lT + lTR);

        const nx = -dx * strength;
        const ny = -dy * strength;
        const nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1.0;

        normData[pixelIdx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
        normData[pixelIdx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
        normData[pixelIdx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
        normData[pixelIdx + 3] = 255;

        const l = lum[idx];
        const goldFactor = Math.pow(l, 1.3);
        const roughVal = Math.round(Math.max(25, Math.min(245, 230 - goldFactor * 195)));

        roughData[pixelIdx] = roughVal;
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

interface SingleCardItemProps {
  card: CardData;
  cardIndex: number;
  currentOrbitIndexRef: React.MutableRefObject<number>;
  totalCards: number;
  baseScale: number;
  basePosY: number;
  settings: CardSettings;
  isFlipped: boolean;
  faceGeometry: THREE.BufferGeometry;
  bodyGeometry: THREE.BufferGeometry;
  onSelectCard: (id: string) => void;
  onFlip?: () => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  gyro?: { x: number; y: number; active: boolean };
}

function SingleCardItem({
  card,
  cardIndex,
  currentOrbitIndexRef,
  totalCards,
  baseScale,
  basePosY,
  settings,
  isFlipped,
  faceGeometry,
  bodyGeometry,
  onSelectCard,
  onFlip,
  isDragging,
  setIsDragging,
  gyro,
}: SingleCardItemProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const [isHovered, setIsHovered] = useState(false);
  useCursor(isHovered, 'pointer', 'auto');
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownInfoRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const lastFlipTimeRef = useRef<number>(0);

  const triggerFlip = () => {
    const now = performance.now();
    if (now - lastFlipTimeRef.current < 400) return;
    lastFlipTimeRef.current = now;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(14);
    }
    onFlip?.();
  };

  // Textures
  const texturesToLoad = [card.albedo, card.back];
  if (card.normal) texturesToLoad.push(card.normal);
  if (card.roughness) texturesToLoad.push(card.roughness);
  if (card.backNormal) texturesToLoad.push(card.backNormal);
  if (card.backRoughness) texturesToLoad.push(card.backRoughness);

  const loaded = useTexture(texturesToLoad);
  const frontAlbedoMap = loaded[0];
  const backAlbedoMap = loaded[1];
  frontAlbedoMap.colorSpace = THREE.SRGBColorSpace;
  backAlbedoMap.colorSpace = THREE.SRGBColorSpace;

  const frontPBR = useMemo(() => {
    if (pbrCache.has(card.albedo)) return pbrCache.get(card.albedo)!;
    if (frontAlbedoMap?.image) {
      const gen = generateProceduralPBR(frontAlbedoMap.image as HTMLImageElement);
      if (gen) {
        pbrCache.set(card.albedo, gen);
        return gen;
      }
    }
    return null;
  }, [card.albedo, frontAlbedoMap?.image]);

  const backPBR = useMemo(() => {
    if (pbrCache.has(card.back)) return pbrCache.get(card.back)!;
    if (backAlbedoMap?.image) {
      const gen = generateProceduralPBR(backAlbedoMap.image as HTMLImageElement);
      if (gen) {
        pbrCache.set(card.back, gen);
        return gen;
      }
    }
    return null;
  }, [card.back, backAlbedoMap?.image]);

  const anisotropyAngle = settings.beamAngle ?? settings.anisotropyRotation ?? 0.785;

  const frontMatRef = useRef<THREE.MeshPhysicalMaterial>(null!);
  const backMatRef = useRef<THREE.MeshPhysicalMaterial>(null!);
  const rimMatRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Calculate shortest angular offset on the 5-card orbital ring
    let deltaIndex = (cardIndex - currentOrbitIndexRef.current) % totalCards;
    if (deltaIndex > totalCards / 2) deltaIndex -= totalCards;
    if (deltaIndex < -totalCards / 2) deltaIndex += totalCards;

    const isCenter = Math.abs(deltaIndex) < 0.15;

    // ── Reverse Arch Cylinder Geometry ──
    // Angle along the top ellipse cylinder orbit
    const spacingAngle = 0.54; // ~31 degrees between card slots
    const theta = deltaIndex * spacingAngle;
    const radius = 5.2; // radius of cylinder orbit

    // Coordinates along the reverse arch
    const targetX = Math.sin(theta) * radius;
    // Curves back into depth
    const targetZ = (Math.cos(theta) - 1) * radius;
    // Curves UPWARD into the reverse arch (higher on the sides, lower in front)
    const archLift = (1 - Math.cos(theta)) * 1.35;
    const targetY = basePosY + archLift;

    // Rotations (Reverse Arch Banking & Yaw)
    // Banking/Roll on Z: right card leans right, left card leans left
    const targetRotZ = -theta * 0.65;
    // Yaw on Y: facing inward toward viewer/center
    const baseRotY = (isCenter && isFlipped ? Math.PI : 0) - theta * 0.92;
    // Slight pitch tilt along cylinder arc
    const targetRotX = (1 - Math.cos(theta)) * 0.12;

    // Scale diminishes slightly with distance
    const distFactor = Math.max(0.68, 1 - Math.abs(deltaIndex) * 0.11);
    const targetScale = baseScale * distFactor;

    const isGyroActive = !!(gyro?.active);
    const effectivePx = isGyroActive ? (gyro?.x ?? 0) : state.pointer.x;
    const effectivePy = isGyroActive ? (gyro?.y ?? 0) : state.pointer.y;
    const maxAngle = settings.maxTiltAngle;

    // Center active card interaction (mouse hover or mobile gyro tilt)
    let activeRotX = targetRotX;
    let activeRotY = baseRotY;
    let activeRotZ = targetRotZ;
    let activePosZ = targetZ;

    if (isCenter) {
      if (isGyroActive) {
        // Gyroscope tilt on mobile: responsive without needing pointer hover
        activeRotX += -effectivePy * maxAngle;
        activeRotY += isFlipped ? -effectivePx * maxAngle : effectivePx * maxAngle;
        activeRotZ += -effectivePx * (maxAngle * 0.15);
        activePosZ += settings.liftZ * 0.5;
      } else if (isHovered || isDragging) {
        activeRotX += -effectivePy * maxAngle;
        activeRotY += isFlipped ? -effectivePx * maxAngle : effectivePx * maxAngle;
        activeRotZ += -effectivePx * (maxAngle * 0.12);
        activePosZ += settings.liftZ;
      } else {
        const t = state.clock.elapsedTime;
        activeRotX += Math.sin(t * 1.3) * 0.025;
        activeRotY += Math.cos(t * 1.0) * 0.025;
        activeRotZ += Math.sin(t * 0.8) * 0.012;
      }
    }

    const dampSpeed = settings.damping ?? 10;
    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, dampSpeed, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, dampSpeed, delta);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, activePosZ, dampSpeed, delta);

    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, activeRotX, dampSpeed, delta);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, activeRotY, dampSpeed, delta);
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, activeRotZ, dampSpeed, delta);

    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.damp(currentScale, targetScale, dampSpeed, delta);
    groupRef.current.scale.set(newScale, newScale, newScale);

    // ── Subtle Depth-of-Field Blur & Softness on Background Cards ──
    const blurAmount = Math.min(1, Math.abs(deltaIndex) * 0.85);
    const targetRoughness = THREE.MathUtils.lerp(settings.roughness, 0.94, blurAmount);
    const targetClearcoat = THREE.MathUtils.lerp(settings.clearcoat, 0.0, blurAmount);
    const targetEnvIntensity = THREE.MathUtils.lerp(settings.envMapIntensity, settings.envMapIntensity * 0.25, blurAmount);

    if (frontMatRef.current) {
      frontMatRef.current.roughness = targetRoughness;
      frontMatRef.current.clearcoat = targetClearcoat;
      frontMatRef.current.envMapIntensity = targetEnvIntensity;
      frontMatRef.current.metalness = settings.metalness;
      frontMatRef.current.anisotropy = settings.anisotropy ?? 0.85;
      frontMatRef.current.anisotropyRotation = anisotropyAngle;
      if (frontPBR?.normalMap && frontMatRef.current.normalScale) {
        frontMatRef.current.normalScale.set(settings.normalScale, settings.normalScale);
      }
    }
    if (backMatRef.current) {
      backMatRef.current.roughness = targetRoughness;
      backMatRef.current.clearcoat = targetClearcoat;
      backMatRef.current.envMapIntensity = targetEnvIntensity;
      backMatRef.current.metalness = settings.metalness;
      backMatRef.current.anisotropy = settings.anisotropy ?? 0.85;
      backMatRef.current.anisotropyRotation = anisotropyAngle;
      if (backPBR?.normalMap && backMatRef.current.normalScale) {
        backMatRef.current.normalScale.set(settings.normalScale, settings.normalScale);
      }
    }
    if (rimMatRef.current) {
      rimMatRef.current.roughness = THREE.MathUtils.lerp(0.18, 0.85, blurAmount);
      rimMatRef.current.emissive.set(settings.goldColor);
    }

    // Hide cards completely behind the back cylinder horizon
    groupRef.current.visible = Math.abs(deltaIndex) <= 2.2;
  });

  return (
    <group
      ref={groupRef}
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

        if (pressDuration < 400 && moveDist < 30) {
          // Calculate if this card is a side card or center card
          let deltaIndex = (cardIndex - currentOrbitIndexRef.current) % totalCards;
          if (deltaIndex > totalCards / 2) deltaIndex -= totalCards;
          if (deltaIndex < -totalCards / 2) deltaIndex += totalCards;

          // If clicked a side card on the arch, immediately switch to it!
          if (Math.abs(deltaIndex) > 0.35) {
            onSelectCard(card.id);
            return;
          }

          // Double tap to flip center card
          const timeSinceLastTap = now - lastTapTimeRef.current;
          const tapGap = Math.hypot(
            e.clientX - lastTapPosRef.current.x,
            e.clientY - lastTapPosRef.current.y
          );

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
      }}
    >
      {/* Metallic Rim / Body */}
      <mesh geometry={bodyGeometry}>
        <meshStandardMaterial
          ref={rimMatRef}
          color="#14121a"
          metalness={0.95}
          roughness={0.18}
          emissive={settings.goldColor}
          emissiveIntensity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Front Face */}
      <mesh geometry={faceGeometry} position={[0, 0, 0.02]} rotation={[0, 0, 0]}>
        <meshPhysicalMaterial
          ref={frontMatRef}
          map={frontAlbedoMap}
          normalMap={frontPBR?.normalMap}
          normalScale={frontPBR?.normalMap ? new THREE.Vector2(settings.normalScale, settings.normalScale) : undefined}
          roughnessMap={frontPBR?.roughnessMap}
          metalness={settings.metalness}
          roughness={settings.roughness}
          clearcoat={settings.clearcoat}
          clearcoatRoughness={settings.clearcoatRoughness}
          anisotropy={settings.anisotropy ?? 0.85}
          anisotropyRotation={anisotropyAngle}
          envMapIntensity={settings.envMapIntensity}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Back Face */}
      <mesh geometry={faceGeometry} position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial
          ref={backMatRef}
          map={backAlbedoMap}
          normalMap={backPBR?.normalMap}
          normalScale={backPBR?.normalMap ? new THREE.Vector2(settings.normalScale, settings.normalScale) : undefined}
          roughnessMap={backPBR?.roughnessMap}
          metalness={settings.metalness}
          roughness={settings.roughness}
          clearcoat={settings.clearcoat}
          clearcoatRoughness={settings.clearcoatRoughness}
          anisotropy={settings.anisotropy ?? 0.85}
          anisotropyRotation={anisotropyAngle}
          envMapIntensity={settings.envMapIntensity}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}

export function CardCarousel3D({
  selectedCardId,
  onSelectCard,
  settings,
  isFlipped,
  isTuningOpen,
  onFlip,
  gyro,
}: CardCarousel3DProps) {
  const [isDragging, setIsDragging] = useState(false);
  const targetIndexRef = useRef(0);
  const currentFloatIndexRef = useRef(0);
  const lightBarRef = useRef<THREE.Group>(null!);

  const { viewport, size } = useThree();
  const isPortrait = size.height > size.width;

  const baseScale = isPortrait
    ? isTuningOpen
      ? Math.min(viewport.width / 3.8, viewport.height / 7.2, 0.78)
      : Math.min(viewport.width / 3.6, viewport.height / 6.2, 0.88)
    : Math.min(viewport.width / 5.5, viewport.height / 4.8, 0.95);

  const basePosY = isPortrait ? (isTuningOpen ? 0.6 : 0.32) : 0;

  const activeIndex = AVE_MUJICA_CARDS.findIndex((c) => c.id === selectedCardId);
  const resolvedActiveIndex = activeIndex !== -1 ? activeIndex : 0;

  useEffect(() => {
    // Shortest path indexing to support infinite circular rotation
    const total = AVE_MUJICA_CARDS.length;
    const currentLogical = ((targetIndexRef.current % total) + total) % total;
    let diff = resolvedActiveIndex - currentLogical;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    targetIndexRef.current += diff;
  }, [resolvedActiveIndex]);

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

  useFrame((state, delta) => {
    const isGyroActive = !!(gyro?.active);
    const effectivePx = isGyroActive ? (gyro?.x ?? 0) : state.pointer.x;
    const effectivePy = isGyroActive ? (gyro?.y ?? 0) : state.pointer.y;

    // Smoothly animate orbit index toward target
    currentFloatIndexRef.current = THREE.MathUtils.damp(
      currentFloatIndexRef.current,
      targetIndexRef.current,
      8.5,
      delta
    );

    // Light beam tracking on the center active card
    if (lightBarRef.current) {
      lightBarRef.current.position.x = THREE.MathUtils.damp(lightBarRef.current.position.x, effectivePx * 3.2, 10, delta);
      lightBarRef.current.position.y = THREE.MathUtils.damp(lightBarRef.current.position.y, effectivePy * 4.2 + basePosY, 10, delta);
      lightBarRef.current.position.z = 2.5;
      lightBarRef.current.rotation.z = beamAngle;
    }
  });

  const beamIntensityFactor = settings.beamIntensity ?? 0.9;
  const activeBeamIntensity = settings.specularFollowIntensity * beamIntensityFactor;
  const beamAngle = settings.beamAngle ?? 0.785;
  const beamDecay = settings.beamSoftness ?? 2.2;
  const beamLines = settings.beamLines ?? 1;
  const beamSpread = settings.beamSpread ?? 0.6;

  return (
    <>
      {/* Spotlight Beam on Center Card */}
      <group ref={lightBarRef} position={[0, basePosY, 2.5]} rotation={[0, 0, beamAngle]}>
        {beamLines === 1 ? (
          <pointLight
            position={[0, 0, 0]}
            intensity={activeBeamIntensity * 1.2}
            color={settings.goldColor}
            distance={settings.specularDistance}
            decay={beamDecay}
          />
        ) : (
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
        )}
      </group>

      {/* 3D Reverse-Arch Carousel Orbit */}
      <group position={[0, 0, 0]}>
        {AVE_MUJICA_CARDS.map((card, idx) => (
          <SingleCardItem
            key={card.id}
            card={card}
            cardIndex={idx}
            currentOrbitIndexRef={currentFloatIndexRef}
            totalCards={AVE_MUJICA_CARDS.length}
            baseScale={baseScale}
            basePosY={basePosY}
            settings={settings}
            isFlipped={isFlipped}
            faceGeometry={faceGeometry}
            bodyGeometry={bodyGeometry}
            onSelectCard={onSelectCard}
            onFlip={onFlip}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            gyro={gyro}
          />
        ))}
      </group>
    </>
  );
}
