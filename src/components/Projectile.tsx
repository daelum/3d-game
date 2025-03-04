import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Line } from '@react-three/drei';
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
  speed = 500,
  damageAmount = 10,
  onHit,
}: ProjectileProps) => {
  const bulletRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<any>(null);
  const [isActive, setIsActive] = useState(true);
  const [lifeTime, setLifeTime] = useState(0);
  const MAX_LIFETIME = 8; // Increased from 3 to 8 seconds for longer range
  
  // Add visual trail effect using simpler approach
  const [trail, setTrail] = useState<THREE.Vector3[]>([]);
  const baseTrailLength = 10; // Base number of trail segments
  const [trailLength, setTrailLength] = useState(baseTrailLength);
  
  // Set up initial velocity in the direction of fire
  useEffect(() => {
    if (rigidBodyRef.current) {
      // Use the direction vector directly since it now includes both direction and speed
      rigidBodyRef.current.setLinvel({ 
        x: direction.x, 
        y: direction.y, 
        z: direction.z 
      });
      
      // Initialize trail with current position
      const initialTrail = [];
      for (let i = 0; i < baseTrailLength; i++) {
        initialTrail.push(new THREE.Vector3(position[0], position[1], position[2]));
      }
      setTrail(initialTrail);
    }
  }, [direction, position]);
  
  // Update lifetime and destroy if too old
  useFrame((state, delta) => {
    if (!isActive) return;
    
    // Update lifetime
    setLifeTime((prev) => {
      const newLifeTime = prev + delta;
      if (newLifeTime > MAX_LIFETIME) {
        setIsActive(false);
      }
      return newLifeTime;
    });
    
    // Update trail positions and length based on speed
    if (rigidBodyRef.current && bulletRef.current) {
      const currentPos = rigidBodyRef.current.translation();
      const currentVel = rigidBodyRef.current.linvel();
      const speed = new THREE.Vector3(currentVel.x, currentVel.y, currentVel.z).length();
      
      // Adjust trail length based on speed (longer trails for faster projectiles)
      const newTrailLength = Math.min(baseTrailLength + Math.floor(speed / 100), 20);
      setTrailLength(newTrailLength);
      
      const newTrailPos = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
      
      setTrail(prevTrail => {
        const newTrail = [newTrailPos, ...prevTrail.slice(0, newTrailLength - 1)];
        return newTrail;
      });
    }
  });
  
  // Handle collision with other objects
  const handleCollision = (event: any) => {
    // Prevent multiple collision handling
    if (!isActive) return;
    
    // Log collision for debugging
    console.log('Projectile collision detected', event);
    
    // Try all possible paths to access the asteroid's userData
    const other = event.other;
    const otherObject = other?.rigidBodyObject || other;
    const otherUserData = otherObject?.userData;
    
    console.log('Collision other object:', other);
    console.log('Collision userData:', otherUserData);
    
    // Check if we hit an asteroid
    if (otherUserData && otherUserData.type === 'asteroid') {
      console.log('Hit asteroid with damage:', damageAmount, 'Asteroid ID:', otherUserData.id);
      
      // Calculate damage based on asteroid size for balanced gameplay
      // Smaller asteroids take proportionally more damage
      let scaledDamage = damageAmount;
      if (otherUserData.size) {
        // Base damage is for size=1, adjust for larger or smaller asteroids
        const sizeFactor = 1 / otherUserData.size;
        scaledDamage = Math.ceil(damageAmount * sizeFactor);
        
        // Ensure minimum damage
        scaledDamage = Math.max(scaledDamage, 5);
        
        console.log(`Size-adjusted damage: ${scaledDamage} for asteroid size ${otherUserData.size}`);
      }
      
      // Try multiple ways to access the takeDamage function
      if (typeof otherUserData.takeDamage === 'function') {
        console.log('Calling takeDamage function from userData');
        otherUserData.takeDamage(scaledDamage);
      } else if (otherObject && typeof otherObject.takeDamage === 'function') {
        console.log('Calling takeDamage function from object');
        otherObject.takeDamage(scaledDamage);
      } else {
        console.error('No takeDamage function found on asteroid:', otherUserData);
      }
      
      // Call onHit callback
      if (onHit) {
        onHit();
      }
      
      // Deactivate the projectile
      setIsActive(false);
    }
  };
  
  if (!isActive) return null;
  
  return (
    <>
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
      
      {/* Render trail using the drei Line component */}
      {trail.length > 1 && (
        <Line
          points={trail}
          color="#ff9900"
          lineWidth={1}
          opacity={0.7}
          transparent
        />
      )}
    </>
  );
};

export default Projectile; 