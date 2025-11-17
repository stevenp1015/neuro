"use client";
import { Vector3 } from "three";
import { NeuroClusterKey } from "./src/types/NeuroClusterKey";
import { NeuroCluster } from "./src/types/NeuroCluster";


export interface ClusteringResult {
  centroids: number[][];
  silhouetteScores: number[];
  activeAxes: number[];
}

export interface Star {
  id: number;
  vector: number[];
  clusterName: NeuroClusterKey;
  constellation: NeuroCluster;
  projection: Vector3;
  volatility: number;
  phase: number;
  centrality: number;
  anomalyScore: number;
  community: string;
}
