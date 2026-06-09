"use client";

/**
 * Landing-page background orchestrator.
 *
 * Always renders the lightweight CSS <AuroraBackground/> first — it's the fast
 * initial paint AND the permanent fallback. Then, only on capable devices, it
 * lazy-loads the WebGL <HeroScene3D/> (a separate chunk, `ssr: false`) and
 * layers it on top (its own deep base covers the aurora while active). If the
 * 3D ever fails at runtime (e.g. WebGL context lost), the error boundary drops
 * it and the aurora remains.
 */

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { AuroraBackground } from "./AuroraBackground";
import { useDeviceCapability } from "./useDeviceCapability";

// Lazy, client-only — keeps three/fiber out of the initial payload + SSR.
const HeroScene3D = dynamic(() => import("./HeroScene3D"), {
  ssr: false,
  loading: () => null,
});

class SceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function CinematicBackground() {
  const { ready, can3D } = useDeviceCapability();

  return (
    <>
      <AuroraBackground />
      {ready && can3D && (
        <SceneErrorBoundary onError={() => {}}>
          <HeroScene3D />
        </SceneErrorBoundary>
      )}
    </>
  );
}
