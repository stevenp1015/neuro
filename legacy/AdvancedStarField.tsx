"use client";
import { useThree, useFrame } from "@react-three/fiber";
import React, { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Vector3 } from "three";
import { NEURO_CLUSTER_NAMES } from "./NEURO_CLUSTERS";
import { AdvancedStarMaterial } from "./AdvancedStarMaterial";
import { useStore } from "./useStore";

// Advanced Star Points with enhanced visualization
export function AdvancedStarField() {
  const stars = useStore((state) => state.stars);
  const filters = useStore((state) => state.filters);
  const activeAxes = useStore((state) => state.activeAxes);
  const colorMode = useStore((state) => state.colorMode);
  const pointSize = useStore((state) => state.pointSize);
  const selectedStars = useStore((state) => state.selectedStars);
  const setHoveredStar = useStore((state) => state.setHoveredStar);

  const pointsRef = useRef<THREE.Points | null>(null);
  const { camera, gl, clock } = useThree();
  const [explosionProgress, setExplosionProgress] = useState(0);
  const [hoveredStarId, setHoveredStarId] = useState<number | null>(null);

  // Generate enhanced geometry attributes
  const { positions, colors, alphas, sizes, clusters, volatilities, phases } =
    useMemo(() => {
      const positions = new Float32Array(stars.length * 3);
      const colors = new Float32Array(stars.length * 3);
      const alphas = new Float32Array(stars.length);
      const sizes = new Float32Array(stars.length);
      const clusters = new Float32Array(stars.length);
      const volatilities = new Float32Array(stars.length);
      const phases = new Float32Array(stars.length);

      stars.forEach((star, i) => {
        positions[i * 3] = star.projection.x;
        positions[i * 3 + 1] = star.projection.y;
        positions[i * 3 + 2] = star.projection.z;

        let color: THREE.Color;
        switch (colorMode) {
          case "function":
            // Color by functional correlation
            const avgValue =
              star.vector.reduce((sum, val) => sum + val, 0) /
              star.vector.length;
            color = new THREE.Color().setHSL(avgValue / 360, 0.8, 0.6);
            break;
          case "individual":
            // Color by unique ID hash
            const hash = star.id * 0.618033988749895;
            const hue = (hash % 1) * 360;
            color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            break;
          default:
            color = new THREE.Color(star.constellation.color);
        }

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = 1.0;
        sizes[i] = pointSize + Math.random() * pointSize;
        clusters[i] = NEURO_CLUSTER_NAMES.indexOf(star.clusterName);
        volatilities[i] = star.volatility;
        phases[i] = star.phase;
      });

      return {
        positions,
        colors,
        alphas,
        sizes,
        clusters,
        volatilities,
        phases,
      } as const;
    }, [stars, colorMode, pointSize]);

  // Create enhanced geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("cluster", new THREE.BufferAttribute(clusters, 1));
    geo.setAttribute("volatility", new THREE.BufferAttribute(volatilities, 1));
    geo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [positions, colors, alphas, sizes, clusters, volatilities, phases]);

  // Enhanced material with advanced effects
  const material = useMemo(() => {
    return new AdvancedStarMaterial({
      uniforms: {
        time: { value: 0 },
        hoveredStar: { value: new Vector3() },
        explosionProgress: { value: 0 },
        colorOffset: { value: 0 },
        alphaMultiplier: { value: 1 },
        pointTexture: {
          value: new THREE.TextureLoader().load(
            "https://threejs.org/examples/textures/sprites/disc.png"
          ),
        },
      },
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true,
    });
  }, []);

  // Update uniforms
  useFrame(() => {
    material.uniforms.time.value = clock.getElapsedTime();
    material.uniforms.explosionProgress.value = explosionProgress;

    if (hoveredStarId !== null) {
      const star = stars.find((s) => s.id === hoveredStarId);
      if (star) {
        material.uniforms.hoveredStar.value.copy(star.projection);
      }
    }
  });

  // Apply filters
  useEffect(() => {
    const alphaAttr = geometry.getAttribute(
      "alpha"
    ) as THREE.BufferAttribute | null;
    if (!alphaAttr) return;

    const alphaArray = alphaAttr.array as Float32Array;

    stars.forEach((star, i) => {
      let visible = true;

      if (activeAxes.size > 0) {
        activeAxes.forEach((axisIdx) => {
          if (!visible) {
            return;
          }
          const val = star.vector[axisIdx];
          const filter = filters[axisIdx];
          if (val < filter.min || val > filter.max) {
            visible = false;
          }
        });
      }

      if (selectedStars.has(star.id)) {
        visible = true;
      }

      alphaArray[i] = visible ? 1.0 : 0.05;
    });

    alphaAttr.needsUpdate = true;
  }, [filters, activeAxes, selectedStars, stars, geometry]);

  // Enhanced raycasting with selection
  useFrame(() => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const points = pointsRef.current;

    if (!points) {
      return;
    }

    // Get mouse position from camera
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = (0 / rect.width) * 2 - 1; // Placeholder - replace with actual pointer tracking
    mouse.y = -((0 / rect.height) * 2 - 1);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(points);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const index = hit.index ?? null;
      if (index === null) {
        return;
      }
      const star = stars[index];
      if (!star) {
        return;
      }

      if (star.id !== hoveredStarId) {
        setHoveredStarId(star.id);
        setHoveredStar(star);
        setExplosionProgress(0.3);
      }
    } else if (hoveredStarId !== null) {
      setHoveredStarId(null);
      setHoveredStar(null);
      setExplosionProgress(0);
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
