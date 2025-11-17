"use client";
import { NEURO_CLUSTER_NAMES } from "@/NEURO_CLUSTERS";

export type NeuroClusterKey = (typeof NEURO_CLUSTER_NAMES)[number];

export type ConnectionSegment = [
  [number, number, number],
  [number, number, number]
];
