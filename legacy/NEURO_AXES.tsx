"use client";
import { NeuroAxis } from "./src/types/NeuroCluster";

// Neurobiological axes with enhanced properties

export const NEURO_AXES: NeuroAxis[] = [
  {
    name: "Tonic Dopamine (PFC)",
    id: "A",
    color: "#ff4d4d",
    weight: 1.2,
    volatility: 0.3,
  },
  {
    name: "Phasic Amplitude (Mesolimbic)",
    id: "B",
    color: "#ffb84d",
    weight: 1.5,
    volatility: 0.8,
  },
  {
    name: "Salience Error (Mesolimbic)",
    id: "C",
    color: "#ff4dff",
    weight: 1.8,
    volatility: 0.9,
  },
  {
    name: "DAT Reuptake (Striatum)",
    id: "D",
    color: "#4dff4d",
    weight: 1.1,
    volatility: 0.4,
  },
  {
    name: "Tonic Serotonin (Raphe)",
    id: "E",
    color: "#4d4dff",
    weight: 1.3,
    volatility: 0.6,
  },
  {
    name: "Norepinephrine (LC)",
    id: "F",
    color: "#4dffff",
    weight: 1.4,
    volatility: 0.7,
  },
  {
    name: "GABA Tone",
    id: "G",
    color: "#ff9980",
    weight: 1.0,
    volatility: 0.2,
  },
  {
    name: "Glutamate Tone",
    id: "H",
    color: "#80ffcc",
    weight: 1.0,
    volatility: 0.3,
  },
  {
    name: "Amygdala Reactivity",
    id: "I",
    color: "#b380ff",
    weight: 1.6,
    volatility: 0.9,
  },
  {
    name: "HPA Axis Tone",
    id: "J",
    color: "#ffffff",
    weight: 1.0,
    volatility: 0.5,
  },
];
