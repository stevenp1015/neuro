"use client";
import { StoreState } from "../../StoreState";


export type VisualizationOptions = Pick<
  StoreState, "showConnections" |
  "showConstellations" |
  "animationSpeed" |
  "colorMode" |
  "pointSize" |
  "detailPanel" |
  "showLegend" |
  "theme"
>;

export type AnalyticsSlice = Pick<
  StoreState, "clustering" |
  "pca" |
  "correlationMatrix" |
  "anomalyThreshold" |
  "anomalyScores"
>;
