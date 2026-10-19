"use client";

export interface RangeFilter {
  min: number;
  max: number;
}

export interface NeuroAxis {
  name: string;
  id: string;
  color: string;
  weight: number;
  volatility: number;
}

export interface NeuroCluster {
  weather: string[];
  color: string;
  prevalence: number;
  centroid: number[];
  covariance: number;
  connections: string[];
}
