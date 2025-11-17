"use client";
import { shaderMaterial } from "@react-three/drei";
import { Vector3 } from "three";

// Advanced shader for stars with dynamic effects

export const AdvancedStarMaterial = shaderMaterial(
  {
    time: 0,
    hoveredStar: new Vector3(),
    explosionProgress: 0,
    colorOffset: 0,
    alphaMultiplier: 1,
  },
  // Vertex Shader
  `
  attribute float size;
  attribute float alpha;
  attribute float cluster;
  attribute float volatility;
  attribute float phase;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vCluster;
  varying float vVolatility;
  varying float vPhase;
  uniform float time;
  uniform float explosionProgress;
  uniform vec3 hoveredStar;
  uniform float colorOffset;

  void main() {
    vColor = color;
    vCluster = cluster;
    vVolatility = volatility;
    vPhase = phase;
    
    // Pulsation based on time, volatility, and unique phase
    float pulse = 0.75 + 0.25 * sin(time * (2.0 + volatility * 8.0) + phase * 10.0);
    vAlpha = alpha * pulse * (1.0 - 0.5 * explosionProgress * smoothstep(0.0, 50.0, distance(position, hoveredStar)));
    
    // Explosion effect for hovered star
    vec3 explosionOffset = vec3(0.0);
    if (explosionProgress > 0.0 && distance(position, hoveredStar) < 100.0) {
      float explode = explosionProgress * (1.0 - smoothstep(0.0, 50.0, distance(position, hoveredStar)));
      explosionOffset = normalize(position - hoveredStar) * explode * 20.0;
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(position + explosionOffset, 1.0);
    gl_PointSize = size * pulse * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
  `,
  // Fragment Shader
  `
  uniform sampler2D pointTexture;
  uniform float time;
  uniform float colorOffset;
  
  varying vec3 vColor;
  varying float vAlpha;
  varying float vCluster;
  varying float vVolatility;
  varying float vPhase;

  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.1) discard;
    
    // Chromatic aberration effect
    vec3 chromatic = vColor;
    chromatic.r += sin(time + vPhase) * 0.1;
    chromatic.b += cos(time * 1.3 + vPhase) * 0.1;
    chromatic.g += sin(time * 0.7 + vPhase) * 0.1;
    
    // Volatility glow
    float glow = 1.0 + vVolatility * 2.0;
    
    vec4 finalColor = vec4(chromatic * glow, vAlpha);
    gl_FragColor = finalColor * tex;
  }
  `
);
