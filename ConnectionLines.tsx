"use client";
import { Line } from "@react-three/drei";
import React, { useState, useEffect } from "react";
import { ConnectionSegment, NeuroClusterKey } from "./src/types/NeuroClusterKey";
import { Star } from "./ClusteringResult";
import { useStore } from "./useStore";

// Connection lines between related stars
export function ConnectionLines() {
  const stars = useStore((state) => state.stars);
  const showConnections = useStore((state) => state.showConnections);
  const [connections, setConnections] = useState<ConnectionSegment[]>([]);

  useEffect(() => {
    if (!showConnections) {
      setConnections([]);
      return;
    }

    // Generate connections based on similarity and clustering
    const newConnections: ConnectionSegment[] = [];
    const clusterMap = new Map<NeuroClusterKey, Star[]>();

    // Group stars by cluster
    stars.forEach((star) => {
      const list = clusterMap.get(star.clusterName) ?? [];
      list.push(star);
      clusterMap.set(star.clusterName, list);
    });

    // Create connections within clusters
    clusterMap.forEach((clusterStars) => {
      for (let i = 0; i < Math.min(clusterStars.length, 100); i += 10) {
        for (let j = i + 1; j < Math.min(i + 5, clusterStars.length); j++) {
          const star1 = clusterStars[i];
          const star2 = clusterStars[j];

          // Only connect nearby stars
          const distance = star1.projection.distanceTo(star2.projection);
          if (distance < 50) {
            newConnections.push([
              [star1.projection.x, star1.projection.y, star1.projection.z],
              [star2.projection.x, star2.projection.y, star2.projection.z],
            ]);
          }
        }
      }
    });

    setConnections(newConnections.slice(0, 50)); // Limit for performance
  }, [stars, showConnections]);

  if (!showConnections || connections.length === 0) return null;

  return (
    <>
      {connections.map((connection, i) => (
        <Line
          key={i}
          points={connection}
          color="#444444"
          lineWidth={0.5}
          opacity={0.3}
          transparent />
      ))}
    </>
  );
}
