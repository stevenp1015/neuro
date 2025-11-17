"use client";
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface FlyThroughCameraProps {
  moveSpeed?: number;
  mouseSensitivity?: number;
  dampingFactor?: number;
}

export function FlyThroughCamera({
  moveSpeed = 50,
  mouseSensitivity = 0.002,
  dampingFactor = 0.92,
}: FlyThroughCameraProps) {
  const { camera, gl } = useThree();

  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const moveDirection = useRef({ forward: 0, right: 0, up: 0 });
  const rotation = useRef({ yaw: 0, pitch: 0 });
  const pointerLocked = useRef(false);

  // Keyboard input state
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const canvas = gl.domElement;

    // Pointer lock setup
    const requestPointerLock = () => {
      canvas.requestPointerLock();
    };

    const onPointerLockChange = () => {
      pointerLocked.current = document.pointerLockElement === canvas;
    };

    const onPointerLockError = () => {
      console.error("Pointer lock error");
    };

    // Mouse movement handler
    const onMouseMove = (event: MouseEvent) => {
      if (!pointerLocked.current) return;

      rotation.current.yaw -= event.movementX * mouseSensitivity;
      rotation.current.pitch -= event.movementY * mouseSensitivity;

      // Clamp pitch to prevent camera flip
      rotation.current.pitch = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, rotation.current.pitch)
      );
    };

    // Keyboard handlers
    const onKeyDown = (event: KeyboardEvent) => {
      keys.current[event.code] = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };

    // Event listeners
    canvas.addEventListener("click", requestPointerLock);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      canvas.removeEventListener("click", requestPointerLock);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [gl, mouseSensitivity]);

  useFrame((state, delta) => {
    // Update move direction from keyboard input
    moveDirection.current.forward =
      (keys.current["KeyW"] ? 1 : 0) + (keys.current["KeyS"] ? -1 : 0);
    moveDirection.current.right =
      (keys.current["KeyD"] ? 1 : 0) + (keys.current["KeyA"] ? -1 : 0);
    moveDirection.current.up =
      (keys.current["Space"] ? 1 : 0) + (keys.current["ShiftLeft"] ? -1 : 0);

    // Calculate camera orientation
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation.current.yaw
    );
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      rotation.current.pitch
    );
    const orientation = yawQuat.multiply(pitchQuat);

    // Calculate movement vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(orientation);
    const up = new THREE.Vector3(0, 1, 0);

    // Apply movement forces
    const targetVelocity = new THREE.Vector3();
    targetVelocity.addScaledVector(forward, moveDirection.current.forward);
    targetVelocity.addScaledVector(right, moveDirection.current.right);
    targetVelocity.addScaledVector(up, moveDirection.current.up);
    targetVelocity.normalize().multiplyScalar(moveSpeed);

    // Smooth velocity with momentum (swimming feel)
    velocity.current.lerp(targetVelocity, 1 - dampingFactor);

    // Update camera position
    camera.position.addScaledVector(velocity.current, delta);

    // Update camera rotation
    camera.quaternion.copy(orientation);
  });

  return null;
}
