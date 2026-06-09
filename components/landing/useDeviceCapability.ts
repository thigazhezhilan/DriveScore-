"use client";

/**
 * Decides whether this device should get the full WebGL hero or the lighter
 * CSS-aurora fallback. Runs only after mount (so SSR/first paint always shows
 * the fallback, then upgrades if capable — never a hydration mismatch).
 *
 * The 3D scene is served ONLY when ALL of these hold:
 *   - WebGL is actually available,
 *   - the user has NOT requested reduced motion,
 *   - it's not a phone (coarse pointer + small viewport),
 *   - it's not obviously low-power (deviceMemory ≤ 2 GB or ≤ 2 cores),
 *   - the connection isn't in data-saver mode.
 * Anything else → fallback.
 */

import { useEffect, useState } from "react";

export type Capability = { ready: boolean; can3D: boolean };

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function useDeviceCapability(): Capability {
  const [state, setState] = useState<Capability>({ ready: false, can3D: false });

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.innerWidth < 820;
    const isPhone = coarse && small;
    const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
    const lowCore =
      typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2;
    const saveData = nav.connection?.saveData === true;

    const can3D =
      hasWebGL() && !reduce && !isPhone && !lowMem && !lowCore && !saveData;

    setState({ ready: true, can3D });
  }, []);

  return state;
}
