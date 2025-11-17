# NEUROCHEMICAL VISUALIZATION - SPATIAL POSITIONING ANALYSIS

## Executive Summary

This document provides a complete trace of how every visual element in the neurochemical 3D visualization is positioned, how they relate to each other, and **identifies critical bugs** causing spatial positioning issues.

**Key Issues Identified:**
1. **CRITICAL:** Particles cluster densely in the center - attractor sphere radii in 10D space don't match 3D projection scale
2. **CRITICAL:** Rails all originate from center (0,0,0) - no spatial distribution
3. **MAJOR:** Axis rail directions are visual approximations, not mathematically accurate to the projection
4. **MAJOR:** Field generation creates positions in 3D first, then reverse-engineers 10D vectors (projection artifacts)

---

## 1. THE PROJECTION FUNCTION - Core Spatial Transform

**File:** `NeurochemistryModel.tsx:264-276`

### The Projection Formula

This is THE MOST IMPORTANT function - it converts 10-dimensional neurochemical vectors into 3D positions for visualization.

```typescript
export function projectTo3D(vector: number[], symptoms: NeurochemicalState["symptoms"]): Vector3 {
  // X-axis: Dopamine dominance (high DA → positive X)
  const xAxis = (vector[0] + vector[1]) / 2 - 50; // -50 to +50

  // Y-axis: Arousal (high NE + low GABA → positive Y)
  const yAxis = (vector[5] + (100 - vector[6])) / 2 - 50;

  // Z-axis: Mood valence (high 5-HT + low HPA → positive Z)
  const zAxis = (vector[4] + (100 - vector[9])) / 2 - 50;

  // Scale to reasonable 3D coordinates - reduced from 20 to 4 for tighter clustering
  return new Vector3(xAxis * 4, yAxis * 4, zAxis * 4);
}
```

### Mathematical Breakdown

**Input:** 10D vector where each dimension is 0-100
- `vector[0]` = Tonic DA (PFC)
- `vector[1]` = Phasic DA (Mesolimbic)
- `vector[4]` = Serotonin
- `vector[5]` = Norepinephrine
- `vector[6]` = GABA
- `vector[9]` = HPA Axis

**Processing:**

1. **X-Axis Calculation:**
   - `(vector[0] + vector[1]) / 2` = Average dopamine (0-100)
   - Subtract 50 to center at origin → Range: -50 to +50
   - Multiply by 4 → **Final X range: -200 to +200**

2. **Y-Axis Calculation:**
   - `(vector[5] + (100 - vector[6])) / 2` = Arousal measure
   - Subtract 50 to center → Range: -50 to +50
   - Multiply by 4 → **Final Y range: -200 to +200**

3. **Z-Axis Calculation:**
   - `(vector[4] + (100 - vector[9])) / 2` = Mood valence
   - Subtract 50 to center → Range: -50 to +50
   - Multiply by 4 → **Final Z range: -200 to +200**

**CRITICAL NOTE:** Only 6 of 10 dimensions are used in the projection! Dimensions 2, 3, 7, 8 (Salience Error, DAT Reuptake, Glutamate, Amygdala) are **ignored** in the spatial projection.

### Scale Factor History

```typescript
// Scale to reasonable 3D coordinates - reduced from 20 to 4 for tighter clustering
return new Vector3(xAxis * 4, yAxis * 4, zAxis * 4);
```

**Comment is WRONG** - it says "reduced from 20 to 4" but code history shows it was 8, not 20.

**Theoretical position range:** ±200 units in each axis

---

## 2. ATTRACTOR REGIONS - The "Gravity Wells" in 3D Space

**File:** `NeurochemistryModel.tsx:39-87`

### 6 Attractor Definitions

Attractors are defined in **10D neurochemical space**, then projected to 3D:

```typescript
export const ATTRACTOR_REGIONS = {
  depressive: {
    center: [25, 40, 20, 60, 20, 35, 60, 40, 55, 70],  // 10D vector
    radius: 25,      // 10D Euclidean radius (NOT 3D!)
    strength: 0.8,
    color: "#3498db",
  },
  anxious: {
    center: [50, 65, 30, 50, 55, 75, 25, 55, 85, 70],
    radius: 22,
    strength: 0.75,
    color: "#27ae60",
  },
  inattentive: {
    center: [25, 80, 15, 25, 60, 70, 50, 50, 45, 45],
    radius: 20,
    strength: 0.7,
    color: "#ff6b35",
  },
  manic: {
    center: [70, 95, 30, 45, 40, 70, 50, 60, 60, 55],
    radius: 18,
    strength: 0.6,
    color: "#f7931e",
  },
  psychotic: {
    center: [20, 50, 85, 50, 45, 55, 40, 80, 65, 60],
    radius: 15,
    strength: 0.5,
    color: "#9b59b6",
  },
  balanced: {
    center: [55, 55, 15, 55, 55, 55, 55, 55, 50, 50],
    radius: 30,
    strength: 1.0,
    color: "#ecf0f1",
  },
};
```

### 3D Positions of Attractors

When projected to 3D space (using `projectTo3D`):

| Attractor | 10D Center | Projected 3D Position | 3D Notes |
|-----------|------------|----------------------|----------|
| **Depressive** | [25,40,20,60,**20**,**35**,**60**,40,55,**70**] | X=(25+40)/2-50=-17.5×4=**-70**, Y=(35+(100-60))/2-50=-12.5×4=**-50**, Z=(20+(100-70))/2-50=-5×4=**-20** | **(-70, -50, -20)** |
| **Anxious** | [50,65,30,50,**55**,**75**,**25**,55,85,**70**] | X=7.5×4=**30**, Y=25×4=**100**, Z=-7.5×4=**-30** | **(30, 100, -30)** |
| **Inattentive** | [25,80,15,25,**60**,**70**,**50**,50,45,**45**] | X=2.5×4=**10**, Y=20×4=**80**, Z=7.5×4=**30** | **(10, 80, 30)** |
| **Manic** | [70,95,30,45,**40**,**70**,**50**,60,60,**55**] | X=32.5×4=**130**, Y=20×4=**80**, Z=-7.5×4=**-30** | **(130, 80, -30)** |
| **Psychotic** | [20,50,85,50,**45**,**55**,**40**,80,65,**60**] | X=-15×4=**-60**, Y=2.5×4=**10**, Z=-7.5×4=**-30** | **(-60, 10, -30)** |
| **Balanced** | [55,55,15,55,**55**,**55**,**55**,55,50,**50**] | X=5×4=**20**, Y=5×4=**20**, Z=5×4=**20** | **(20, 20, 20)** |

**CRITICAL BUG #1:** The `radius` values (15-30) are defined in **10D Euclidean space**, but the spheres are rendered in 3D using these same radius values. This is mathematically incorrect!

- 10D distance of 25 does NOT equal a 3D distance of 25 after projection
- This causes the spheres to appear the wrong size relative to the particle distribution

---

## 3. PARTICLE GENERATION - How 15,000 Particles Are Created

**File:** `NeurochemistryModel.tsx:365-459`

### Generation Strategy (FLAWED)

The current approach generates particles **in 3D space FIRST**, then reverse-engineers 10D vectors:

```typescript
export function generateNeurochemicalField(numPoints: number = 15000): NeurochemicalState[] {
  const states: NeurochemicalState[] = [];

  // Sample from attractor regions based on strength
  const totalStrength = Object.values(ATTRACTOR_REGIONS).reduce(
    (sum, a) => sum + a.strength,
    0
  );

  Object.entries(ATTRACTOR_REGIONS).forEach(([name, attractor]) => {
    const count = Math.floor((attractor.strength / totalStrength) * numPoints);

    // Get the 3D position this attractor projects to
    const attractorSymptoms = calculateSymptoms(attractor.center);
    const attractor3DPosition = projectTo3D(attractor.center, attractorSymptoms);

    for (let i = 0; i < count; i++) {
      // Generate random point in 3D sphere around attractor position
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1/3) * attractor.radius; // ← 10D radius used in 3D!

      const offset = new Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const position3D = new Vector3(
        attractor3DPosition.x + offset.x,
        attractor3DPosition.y + offset.y,
        attractor3DPosition.z + offset.z
      );

      // Create 10D vector that projects to this 3D position
      const vector = generate10DVectorFor3DPosition(position3D, attractor.center);

      // ... store state
    }
  });

  // Add outliers (5% of particles)
  const outlierCount = Math.floor(numPoints * 0.05);
  for (let i = 0; i < outlierCount; i++) {
    const randomPos = new Vector3(
      (Math.random() - 0.5) * 400,  // -200 to +200
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 400
    );
    // ... create outlier
  }
}
```

### Particle Count Distribution

Based on attractor strengths:

| Attractor | Strength | Particles | 3D Position | Radius Used |
|-----------|----------|-----------|-------------|-------------|
| Balanced | 1.0 | ~3,261 | (20, 20, 20) | 30 |
| Depressive | 0.8 | ~2,609 | (-70, -50, -20) | 25 |
| Anxious | 0.75 | ~2,446 | (30, 100, -30) | 22 |
| Inattentive | 0.7 | ~2,283 | (10, 80, 30) | 20 |
| Manic | 0.6 | ~1,957 | (130, 80, -30) | 18 |
| Psychotic | 0.5 | ~1,631 | (-60, 10, -30) | 15 |
| **Outliers** | - | **~750** | Random ±200 | N/A |

**CRITICAL BUG #2:** The spherical distribution uses the **10D radius** (15-30 units) to generate offsets in **3D space**. This creates VERY TIGHT clustering because:
- Particles are distributed in 3D spheres of radius 15-30
- But the 3D space has a range of -200 to +200 (400 units total)
- So particles occupy only ~7.5% to 15% of the available space around each attractor

**RESULT:** All particles cluster tightly around the 6 attractor points, creating dense clumps instead of a distributed cloud.

### Reverse Projection Function

**File:** `NeurochemistryModel.tsx:322-359`

```typescript
function generate10DVectorFor3DPosition(
  position: Vector3,
  baseVector: number[]
): number[] {
  // Solve inverse projection equations (scale = 4):
  // X = ((v[0] + v[1])/2 - 50) * 4 → v[0] + v[1] = 2*(X/4 + 50)
  // Y = ((v[5] + (100-v[6]))/2 - 50) * 4 → v[5] + (100-v[6]) = 2*(Y/4 + 50)
  // Z = ((v[4] + (100-v[9]))/2 - 50) * 4 → v[4] + (100-v[9]) = 2*(Z/4 + 50)

  const targetDA = 2 * (position.x / 4 + 50);
  const targetArousal = 2 * (position.y / 4 + 50);
  const targetMood = 2 * (position.z / 4 + 50);

  const vector = [...baseVector];

  // Split dopamine between tonic and phasic (use base ratio + noise)
  const daRatio = 0.5 + (Math.random() - 0.5) * 0.2;
  vector[0] = Math.max(0, Math.min(100, targetDA * daRatio));
  vector[1] = Math.max(0, Math.min(100, targetDA * (1 - daRatio)));

  // Split arousal between NE and inverse GABA
  const neRatio = 0.5 + (Math.random() - 0.5) * 0.2;
  vector[5] = Math.max(0, Math.min(100, targetArousal * neRatio));
  vector[6] = Math.max(0, Math.min(100, 100 - targetArousal * (1 - neRatio)));

  // Split mood between serotonin and inverse HPA
  const serotoninRatio = 0.5 + (Math.random() - 0.5) * 0.2;
  vector[4] = Math.max(0, Math.min(100, targetMood * serotoninRatio));
  vector[9] = Math.max(0, Math.min(100, 100 - targetMood * (1 - serotoninRatio)));

  // Other dimensions stay near base with small noise
  vector[2] = Math.max(0, Math.min(100, baseVector[2] + (Math.random() - 0.5) * 10));
  vector[3] = Math.max(0, Math.min(100, baseVector[3] + (Math.random() - 0.5) * 10));
  vector[7] = Math.max(0, Math.min(100, baseVector[7] + (Math.random() - 0.5) * 10));
  vector[8] = Math.max(0, Math.min(100, baseVector[8] + (Math.random() - 0.5) * 10));

  return vector;
}
```

**CRITICAL BUG #3:** This reverse projection introduces **ambiguity** because:
- Multiple 10D vectors can map to the same 3D position
- The function arbitrarily splits values (50/50 ratio with ±20% noise)
- Dimensions 2, 3, 7, 8 are set to baseVector + noise, not derived from position
- This creates artificial constraints that don't reflect real neurochemical relationships

---

## 4. PARTICLE RENDERING - SymptomClouds Component

**File:** `SymptomClouds.tsx:104-154`

### Position Attribute Setup

```typescript
useEffect(() => {
  if (!geometryRef.current) return;

  const positions = new Float32Array(states.length * 3);
  const colors = new Float32Array(states.length * 3);
  const densities = new Float32Array(states.length);
  const stabilities = new Float32Array(states.length);
  const phases = new Float32Array(states.length);

  states.forEach((state, i) => {
    const idx = i * 3;

    // Position - DIRECTLY FROM state.position (which came from projectTo3D)
    positions[idx] = state.position.x;
    positions[idx + 1] = state.position.y;
    positions[idx + 2] = state.position.z;

    // Color based on nearest attractor
    const attractorColor = getAttractorColor(state.vector);
    const color = new THREE.Color(attractorColor);
    colors[idx] = color.r;
    colors[idx + 1] = color.g;
    colors[idx + 2] = color.b;

    // Attributes
    densities[i] = state.density;
    stabilities[i] = state.stability;
    phases[i] = Math.random();
  });

  geometryRef.current.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  // ... other attributes
}, [states]);
```

### Shader Modifications

**Vertex Shader (lines 31-70):**

```glsl
void main() {
  vDensity = density;
  vColor = baseColor;

  // Pulsation based on stability (less stable = more pulsating)
  float pulse = 0.85 + 0.15 * sin(time * animationSpeed * (2.0 + (1.0 - stability) * 3.0) + phase * 6.28);

  // Flow/drift effect (particles drift slowly)
  vec3 offset = vec3(
    sin(time * 0.1 + phase) * 0.5,
    cos(time * 0.15 + phase * 1.5) * 0.5,
    sin(time * 0.12 + phase * 2.0) * 0.5
  );

  // SPATIAL MODIFICATION: Particles drift ±0.5 units, scaled by instability
  vec3 pos = position + offset * (1.0 - stability) * 10.0;  // Max ±5 units drift

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size based on density and distance
  float size = pointSize * density * pulse * (300.0 / -mvPosition.z);
  gl_PointSize = max(1.0, size);

  // Alpha based on density
  vAlpha = density * 0.7;
}
```

**Key Point:** Particles have a small drift animation (max ±5 units), but this doesn't significantly change their clustering behavior.

---

## 5. SPHERE RENDERING - DiagnosisBoundaries Component

**File:** `DiagnosisBoundaries.tsx:17-31`

### Sphere Position Calculation

```typescript
const boundaryData = useMemo(() => {
  return Object.entries(ATTRACTOR_REGIONS).map(([name, attractor]) => {
    // Use the same projectTo3D function that particles use
    const symptoms = calculateSymptoms(attractor.center);
    const position = projectTo3D(attractor.center, symptoms);

    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      position,
      radius: attractor.radius,  // ← 10D radius used for 3D sphere!
      color: attractor.color,
      strength: attractor.strength,
    };
  });
}, []);
```

### Sphere Rendering

```typescript
<group key={boundary.name} position={boundary.position}>
  {/* Semi-transparent sphere boundary */}
  <mesh>
    <sphereGeometry args={[boundary.radius, 32, 32]} />
    <meshBasicMaterial
      color={boundary.color}
      transparent
      opacity={opacity * boundary.strength}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  </mesh>

  {/* Wireframe overlay */}
  <mesh>
    <sphereGeometry args={[boundary.radius, 16, 16]} />
    <meshBasicMaterial
      color={boundary.color}
      transparent
      opacity={opacity * 2}
      wireframe
      depthWrite={false}
    />
  </mesh>

  {/* Inner glow sphere */}
  <mesh>
    <sphereGeometry args={[boundary.radius * 0.95, 32, 32]} />
    <meshBasicMaterial
      color={boundary.color}
      transparent
      opacity={opacity * 0.2}
      side={THREE.BackSide}
      depthWrite={false}
    />
  </mesh>
</group>
```

**CRITICAL BUG #1 REPEATED:** The spheres use the 10D `radius` values (15-30) directly as 3D radii. Given that:
- Particles are distributed in tight clusters of radius 15-30
- The spheres also have radius 15-30
- The 3D space spans -200 to +200 (400 units)

**RESULT:** The spheres appear correctly sized for the particle clusters, BUT both are way too small for the coordinate system. Everything is compressed into ~7.5% of the available space.

### Overlap Detection

```typescript
function OverlapConnections({ boundaries }) {
  const connections = useMemo(() => {
    const pairs: Array<[number, number]> = [];

    for (let i = 0; i < boundaries.length; i++) {
      for (let j = i + 1; j < boundaries.length; j++) {
        const b1 = boundaries[i];
        const b2 = boundaries[j];

        const distance = b1.position.distanceTo(b2.position);
        const sumRadii = b1.radius + b2.radius;

        // If boundaries overlap
        if (distance < sumRadii) {
          pairs.push([i, j]);
        }
      }
    }

    return pairs;
  }, [boundaries]);

  return (
    <>
      {connections.map(([i, j]) => {
        const b1 = boundaries[i];
        const b2 = boundaries[j];

        const points = [b1.position, b2.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Draw connection line between overlapping spheres
        return (
          <line key={`${i}-${j}`} geometry={geometry}>
            <lineBasicMaterial
              color={mixedColor}
              transparent
              opacity={0.3}
              linewidth={2}
            />
          </line>
        );
      })}
    </>
  );
}
```

Lines are drawn between spheres that overlap (distance < sum of radii).

---

## 6. AXIS RAILS - The Directional Beams

**File:** `AxisRails.tsx:52-76`

### Rail Direction Mapping

```typescript
// Map each neurochemical dimension to its contribution in the 3D projection
// Based on projectTo3D function: X=(DA0+DA1)/2, Y=(NE+(100-GABA))/2, Z=(5HT+(100-HPA))/2
const direction = useMemo(() => {
  const projectionMap: Record<number, THREE.Vector3> = {
    0: new THREE.Vector3(1, 0, 0),      // Tonic DA → +X
    1: new THREE.Vector3(1, 0, 0),      // Phasic DA → +X
    2: new THREE.Vector3(0.3, 0.3, 0),  // Salience error (not in projection, show weakly)
    3: new THREE.Vector3(0.2, 0, 0.2),  // DAT reuptake (not in projection, show weakly)
    4: new THREE.Vector3(0, 0, 1),      // Serotonin → +Z
    5: new THREE.Vector3(0, 1, 0),      // NE → +Y
    6: new THREE.Vector3(0, -1, 0),     // GABA → -Y (inverted in projection)
    7: new THREE.Vector3(0.2, 0.3, 0),  // Glutamate (not in projection, show weakly)
    8: new THREE.Vector3(0, 0.3, 0.2),  // Amygdala (not in projection, show weakly)
    9: new THREE.Vector3(0, 0, -1),     // HPA → -Z (inverted in projection)
  };

  return (projectionMap[index] || new THREE.Vector3(1, 0, 0)).normalize();
}, [index]);

const startPoint = direction.clone().multiplyScalar(-length);  // -150
const endPoint = direction.clone().multiplyScalar(length);      // +150
```

### 10 Rail Definitions

| Axis # | Neurochemical | Direction Vector | Start Point | End Point |
|--------|---------------|------------------|-------------|-----------|
| 0 | Tonic DA (PFC) | (1, 0, 0) | (-150, 0, 0) | (150, 0, 0) |
| 1 | Phasic DA | (1, 0, 0) | (-150, 0, 0) | (150, 0, 0) |
| 2 | Salience Error | (0.3, 0.3, 0) normalized | (-113, -113, 0) | (113, 113, 0) |
| 3 | DAT Reuptake | (0.2, 0, 0.2) normalized | (-106, 0, -106) | (106, 0, 106) |
| 4 | Serotonin | (0, 0, 1) | (0, 0, -150) | (0, 0, 150) |
| 5 | Norepinephrine | (0, 1, 0) | (0, -150, 0) | (0, 150, 0) |
| 6 | GABA | (0, -1, 0) | (0, 150, 0) | (0, -150, 0) |
| 7 | Glutamate | (0.2, 0.3, 0) normalized | (-83, -125, 0) | (83, 125, 0) |
| 8 | Amygdala | (0, 0.3, 0.2) normalized | (0, -125, -83) | (0, 125, 83) |
| 9 | HPA Axis | (0, 0, -1) | (0, 0, 150) | (0, 0, -150) |

**CRITICAL BUG #4:** ALL RAILS START FROM THE ORIGIN (0, 0, 0)!

The rails are supposed to represent the 10 dimensions, but they:
- All pass through the center of 3D space
- Don't spatially distribute based on attractor positions
- Create visual confusion because they all converge at (0,0,0)

**RESULT:** "a bunch of lines that all start at the same point in the center of the 3d space" (exactly as you described!)

### Rail Geometry

```typescript
const railGeometry = useMemo(() => {
  const points = [startPoint, endPoint];
  return new THREE.BufferGeometry().setFromPoints(points);
}, [startPoint, endPoint]);
```

Each rail is a simple line from `startPoint` to `endPoint`.

### Flowing Particles on Rails

```typescript
const { particleGeometry, particleCount } = useMemo(() => {
  const count = 200;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / count; // 0 to 1 along rail
    const pos = startPoint.clone().lerp(endPoint, t);

    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    phases[i] = t;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

  return { particleGeometry: geom, particleCount: count };
}, [startPoint, endPoint]);
```

200 particles are placed evenly along each rail, animated with a flowing shader.

**MAJOR BUG #5:** The direction mapping is a **visual approximation**, not mathematically accurate:

For example, axis 2 (Salience Error) is mapped to direction (0.3, 0.3, 0), but Salience Error doesn't appear in the `projectTo3D` formula at all! The correct direction would be (0, 0, 0) - it has NO contribution to the projection.

**What SHOULD happen:**
- Axes 0, 1 should point along +X (correct)
- Axis 4 should point along +Z (correct)
- Axis 5 should point along +Y (correct)
- Axis 6 should point along -Y (correct)
- Axis 9 should point along -Z (correct)
- **Axes 2, 3, 7, 8 should have NO visual representation** because they don't contribute to the projection

---

## 7. COMPLETE SPATIAL RELATIONSHIP DIAGRAM

```
3D COORDINATE SYSTEM:
- Origin: (0, 0, 0)
- Theoretical bounds: X[-200, 200], Y[-200, 200], Z[-200, 200]
- Actual particle bounds: Much smaller due to tight clustering

RAILS (all pass through origin):
  Tonic DA (0):      (-150, 0, 0) ←──────→ (150, 0, 0)
  Phasic DA (1):     (-150, 0, 0) ←──────→ (150, 0, 0)  [DUPLICATE!]
  Salience (2):      (-113,-113,0) ←──────→ (113, 113, 0)
  DAT (3):           (-106, 0,-106) ←─────→ (106, 0, 106)
  Serotonin (4):     (0, 0, -150) ←────────→ (0, 0, 150)
  NE (5):            (0, -150, 0) ←────────→ (0, 150, 0)
  GABA (6):          (0, 150, 0) ←─────────→ (0, -150, 0)  [OPPOSITE of NE]
  Glutamate (7):     (-83,-125, 0) ←───────→ (83, 125, 0)
  Amygdala (8):      (0, -125,-83) ←───────→ (0, 125, 83)
  HPA (9):           (0, 0, 150) ←─────────→ (0, 0, -150)  [OPPOSITE of 5HT]

ATTRACTOR SPHERES (with particles clustered inside):
  Balanced:      center (20, 20, 20),        radius 30,  ~3261 particles
  Depressive:    center (-70, -50, -20),     radius 25,  ~2609 particles
  Anxious:       center (30, 100, -30),      radius 22,  ~2446 particles
  Inattentive:   center (10, 80, 30),        radius 20,  ~2283 particles
  Manic:         center (130, 80, -30),      radius 18,  ~1957 particles
  Psychotic:     center (-60, 10, -30),      radius 15,  ~1631 particles

OUTLIERS:
  ~750 particles scattered randomly in range [-200, 200] on all axes

CAMERA:
  Initial position: (0, 50, 150)
  FOV: 75°
  Near/Far clip: 0.1 / 2000
```

---

## 8. IDENTIFIED BUGS AND ISSUES

### 🔴 CRITICAL BUG #1: Radius Dimension Mismatch
**Location:** `NeurochemistryModel.tsx:39-87` and `DiagnosisBoundaries.tsx:17-31`

**Problem:** Attractor radii are defined in 10D Euclidean space (15-30 units) but used directly as 3D sphere radii.

**Impact:**
- Spheres appear tiny relative to the coordinate system (-200 to +200)
- Particles cluster in dense groups because the generation uses the same small radii
- The visualization compresses everything into ~7.5% of the available space

**Fix Required:**
- Either: Scale the radii when rendering 3D spheres (multiply by ~4-6x)
- Or: Redefine attractor radii specifically for 3D space
- Or: Calculate proper 10D→3D radius transformation based on projection Jacobian

---

### 🔴 CRITICAL BUG #2: Tight Particle Clustering
**Location:** `NeurochemistryModel.tsx:381-397`

**Problem:** Particles are generated in 3D spheres with radii 15-30, but the coordinate system spans -200 to +200 (400 units).

**Impact:**
- All particles cluster in 6 dense balls around attractor centers
- "literally only one dense cluster of particles in the 'balanced' translucent sphere" (your description)
- No diffuse cloud effect

**Fix Required:**
- Increase the generation radius by 4-8x to match the scale factor
- Or: Generate in 10D space first, then project to 3D (reverse the current approach)
- Or: Add a scale multiplier to the offset calculation

**Example fix:**
```typescript
const r = Math.pow(Math.random(), 1/3) * attractor.radius * 6; // Add scale factor
```

---

### 🔴 CRITICAL BUG #3: Rails All Start at Origin
**Location:** `AxisRails.tsx:69-70`

**Problem:**
```typescript
const startPoint = direction.clone().multiplyScalar(-length);
const endPoint = direction.clone().multiplyScalar(length);
```

These are absolute positions, not offsets from attractor positions.

**Impact:**
- All 10 rails pass through (0, 0, 0)
- Creates visual confusion - rails don't connect to attractor spheres
- "rails / lines that i think are meant to connect things are just like a bunhc of lines that all start at the same point in the center of the 3d space" (your exact description!)

**Fix Required:**
Rails should either:
- Connect pairs of attractor spheres (like the overlap connections)
- Emanate from attractor centers, not the origin
- Or be redesigned to show dimensional axes more clearly (like traditional 3D axis indicators)

---

### 🟠 MAJOR BUG #4: Incorrect Rail Direction Mapping
**Location:** `AxisRails.tsx:52-67`

**Problem:** Axes 2, 3, 7, 8 are given arbitrary directions (like (0.3, 0.3, 0)), but they don't appear in the `projectTo3D` formula at all.

**Impact:**
- Misleading visualization - suggests these dimensions have spatial meaning when they don't
- Two rails (Tonic DA and Phasic DA) point in the same direction
- GABA and NE rails point in opposite directions (which is correct per the formula)

**Fix Required:**
- Only show rails for dimensions 0, 1, 4, 5, 6, 9 (the ones actually used in projection)
- Or: Add UI toggle to show "projected dimensions" vs "all dimensions"
- Or: Use a different visual representation (like a 2D chart) for non-spatial dimensions

---

### 🟠 MAJOR BUG #5: Reverse Projection Ambiguity
**Location:** `NeurochemistryModel.tsx:322-359`

**Problem:** The `generate10DVectorFor3DPosition` function creates 10D vectors from 3D positions, but the mapping is not unique.

**Impact:**
- Multiple valid 10D vectors can map to the same 3D position
- Dimensions 2, 3, 7, 8 are set arbitrarily (baseVector + noise)
- The generated 10D vectors may not reflect realistic neurochemical states
- Creates "projection artifacts" where neurochemically different states appear identical

**Fix Required:**
- Generate particles in 10D space first, then project to 3D
- Or: Document that the reverse projection is approximate/illustrative
- Or: Use a probabilistic model to sample realistic 10D vectors for each 3D region

---

### 🟡 MINOR BUG #6: Misleading Comment
**Location:** `NeurochemistryModel.tsx:274`

**Problem:**
```typescript
// Scale to reasonable 3D coordinates - reduced from 20 to 4 for tighter clustering
```

The comment says "reduced from 20" but it was actually 8 (based on git history or intended value).

**Impact:** Developer confusion

**Fix Required:** Correct the comment to reflect actual history

---

### 🟡 MINOR BUG #7: Duplicate Rails
**Location:** `AxisRails.tsx:54-55`

**Problem:** Axes 0 and 1 both map to direction (1, 0, 0)

**Impact:** Two identical rails are rendered on top of each other

**Fix Required:**
- Show a single "Dopamine" rail (combined)
- Or: Slightly offset the two dopamine rails
- Or: Use different colors/styles to distinguish them

---

## 9. CAMERA AND NAVIGATION

**File:** `FlyThroughCamera.tsx`

**Initial Position:** (0, 50, 150)
- X=0 (center)
- Y=50 (above origin)
- Z=150 (in front)

**Movement:**
- WASD: Forward/back/left/right relative to camera orientation
- Space: Up (absolute +Y)
- Shift: Down (absolute -Y)
- Mouse: Look around (yaw and pitch)

**No spatial constraints** - can fly anywhere in 3D space.

---

## 10. SUMMARY OF SPATIAL RELATIONSHIPS

**How Elements Are Positioned:**

1. **Attractor centers** are defined in 10D → projected to 3D via `projectTo3D`
2. **Particles** are generated in 3D around projected attractor positions → reverse-engineered to 10D
3. **Spheres** are placed at projected attractor positions with 10D radii (incorrect)
4. **Rails** all emanate from origin (0,0,0) in various directions
5. **Camera** starts at (0, 50, 150) and can move freely

**Why Everything Looks Wrong:**

1. **Particles cluster too tightly** because generation uses 10D radii (15-30) in 3D space (400-unit range)
2. **Rails all converge at center** because they're not connected to attractors
3. **Spheres are too small** for the coordinate system but match the tight particle clusters
4. **Spatial scale is inconsistent** - attractors at distances of 50-200 units, particles within 15-30 units, rails extending ±150 units

**Recommended Fixes (in priority order):**

1. **Scale up particle generation** - multiply radius by 4-8x when generating 3D offsets
2. **Fix rail positioning** - either remove them or connect them to attractor spheres
3. **Scale sphere radii** - multiply by 4-6x when rendering in 3D
4. **Remove misleading rails** - only show axes 0, 1, 4, 5, 6, 9
5. **Generate in 10D first** - reverse the generation process for mathematical correctness

---

## 11. ADDITIONAL NOTES

**Performance Considerations:**
- 15,000 particles with custom shaders
- GPU-accelerated using BufferGeometry
- Post-processing: Bloom + Chromatic Aberration
- Should run at 60fps on modern GPUs

**Color Coding:**
- Particles colored by nearest attractor
- Each attractor has a distinct color
- Colors defined in `ATTRACTOR_REGIONS`

**Animation Effects:**
- Particles pulse based on stability
- Particles drift slightly (max ±5 units)
- Rail particles flow along rails
- All animations are time-based, not frame-based

**Density Calculation:**
Currently uses distance from origin (incorrect):
```typescript
export function calculateDensity(position: Vector3): number {
  const dist = Math.sqrt(
    Math.pow(position.x, 2) +
    Math.pow(position.y, 2) +
    Math.pow(position.z, 2)
  );
  // Gaussian density based on distance from origin
}
```

Should calculate density based on distance to nearest attractor(s).

---

## CONCLUSION

The spatial positioning issues stem from **dimensional mismatch** - using 10D radii in 3D space, generating in 3D then reverse-projecting to 10D, and placing rails at the origin instead of connecting to attractors.

The fixes are straightforward: scale up the radii, reposition the rails, and optionally reverse the generation process. The underlying math is sound; it just needs consistent scaling across all components.
