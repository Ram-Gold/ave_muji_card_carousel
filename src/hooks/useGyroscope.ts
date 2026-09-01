import { useState, useEffect, useRef, useCallback } from 'react';

export interface GyroscopeState {
  isSupported: boolean;
  permissionGranted: boolean;
  isActive: boolean;
  /** Normalized tilt from -1.0 to 1.0 (gamma: left/right roll) */
  gamma: number;
  /** Normalized tilt from -1.0 to 1.0 (beta: forward/backward pitch relative to resting angle) */
  beta: number;
  requestPermission: () => Promise<boolean>;
}

export function useGyroscope(options?: { naturalTiltAngle?: number }): GyroscopeState {
  const naturalTilt = options?.naturalTiltAngle ?? 45; // typical phone reading holding angle (degrees)
  const [isSupported, setIsSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const rawRef = useRef({ gamma: 0, beta: 0 });
  const [coords, setCoords] = useState({ gamma: 0, beta: 0 });

  // Check if deviceorientation is supported
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasOrientation = 'DeviceOrientationEvent' in window;
    // Check if permission API exists (iOS 13+)
    const needsPermission =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function';

    setIsSupported(hasOrientation);

    if (hasOrientation && !needsPermission) {
      // Non-iOS or older iOS does not require explicit permission prompt
      setPermissionGranted(true);
    }
  }, []);

  const handleOrientation = useCallback(
    (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;

      setIsActive(true);

      // Gamma is [-90, 90] (left/right tilt)
      // Beta is [-180, 180] (front/back tilt)
      // Normalize gamma: clamp to [-35, 35] deg and map to [-1, 1]
      const clampedGamma = Math.max(-35, Math.min(35, e.gamma));
      const normGamma = clampedGamma / 35;

      // Normalize beta relative to natural phone holding angle (~45 deg)
      // Clamp difference to [-35, 35] deg and map to [-1, 1]
      const deltaBeta = e.beta - naturalTilt;
      const clampedBeta = Math.max(-35, Math.min(35, deltaBeta));
      const normBeta = clampedBeta / 35;

      rawRef.current = { gamma: normGamma, beta: normBeta };
      setCoords({ gamma: normGamma, beta: normBeta });
    },
    [naturalTilt]
  );

  useEffect(() => {
    if (!permissionGranted) return;

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionGranted, handleOrientation]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return false;
    }

    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof doe.requestPermission === 'function') {
      try {
        const response = await doe.requestPermission();
        const granted = response === 'granted';
        setPermissionGranted(granted);
        return granted;
      } catch (err) {
        console.warn('Gyroscope permission request error:', err);
        return false;
      }
    } else {
      setPermissionGranted(true);
      return true;
    }
  }, []);

  return {
    isSupported,
    permissionGranted,
    isActive,
    gamma: coords.gamma,
    beta: coords.beta,
    requestPermission,
  };
}
