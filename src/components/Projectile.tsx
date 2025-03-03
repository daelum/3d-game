import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

interface ProjectileProps {
  position: [number, number, number];
  direction: THREE.Vector3;
  speed?: number;
  damageAmount?: number;
  onHit?: () => void;
}

const Projectile = ({
  position,
  direction,
  speed = 50,
  damageAmount = 10,
  onHit,
}: ProjectileProps) => {
  const bulletRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<any>(null);
  const [isActive, setIsActive] = useState(true);
  const [lifeTime, setLifeTime] = useState(0);
  const MAX_LIFETIME = 3; // seconds
  
  // Set up initial velocity in the direction of fire
  useEffect(() => {
    if (rigidBodyRef.current) {
      const normalizedDir = direction.clone().normalize();
      const velocity = normalizedDir.multiplyScalar(speed);
      rigidBodyRef.current.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z });
    }
  }, [direction, speed]);
  
  // Update lifetime and destroy if too old
  useFrame((state, delta) => {
    if (!isActive) return;
    
    setLifeTime((prev) => {
      const newLifeTime = prev + delta;
      if (newLifeTime > MAX_LIFETIME) {
        setIsActive(false);
      }
      return newLifeTime;
    });
  });
  
  // Handle collision with other objects
  const handleCollision = (event: any) => {
    // Check if we hit an asteroid or other target
    if (event.other.rigidBodyObject && event.other.rigidBodyObject.name === 'asteroid') {
      if (onHit) {
        onHit();
      }
      setIsActive(false);
    }
  };
  
  if (!isActive) return null;
  
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      colliders={false}
      gravityScale={0}
      onCollisionEnter={handleCollision}
      restitution={0}
      friction={0}
      userData={{ type: 'projectile', damageAmount }}
    >
      <mesh ref={bulletRef} name="projectile">
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial 
          emissive="#ff9900"
          emissiveIntensity={2}
          color="#ffff00"
        />
        <pointLight intensity={2} distance={2} color="#ff9900" />
      </mesh>
      <CuboidCollider args={[0.1, 0.1, 0.1]} sensor />
    </RigidBody>
  );
};

export default Projectile; 