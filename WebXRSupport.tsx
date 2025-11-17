"use client";
import { XR, VRButton } from "@react-three/xr";
import { useStore } from "./useStore";

/**
 * WebXR support for Quest browser
 * Enables VR mode with hand tracking and immersive navigation
 */

export function WebXRButton() {
  const setVRMode = useStore((state) => state.setVRMode);

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
      <VRButton
        onSessionStart={() => setVRMode(true)}
        onSessionEnd={() => setVRMode(false)}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg border-2 border-purple-400 shadow-lg transition-all duration-200"
      />
    </div>
  );
}

export function WebXRProvider({ children }: { children: React.ReactNode }) {
  return (
    <XR>
      {children}
    </XR>
  );
}
