import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
import { RigidBody } from '@react-three/rapier';
import { PlayerData } from '../services/SocketService';
import { GLTF } from 'three-stdlib';

// Define the type for the GLTF model
type GLTFResult = GLTF & {
  nodes: {
    model: THREE.Mesh;
  };
  materials: {
    CustomMaterial: THREE.MeshStandardMaterial;
  };
};

interface OtherPlayerProps {
  player: PlayerData;
}

// A component to render other players in the game
const OtherPlayer = ({ player }: OtherPlayerProps) => {
  const { nodes, materials } = useGLTF('/models/ship.gltf') as GLTFResult;
  const shipRef = useRef<THREE.Mesh>(null);
  const targetPosition = useRef<THREE.Vector3>(new THREE.Vector3(...player.position));
  const targetRotation = useRef<THREE.Euler>(new THREE.Euler(...player.rotation));
  const currentThrottle = useRef<number>(player.throttle);
  const engineGlowRef = useRef<THREE.Mesh>(null);
  const [hasLoggedInitialRender, setHasLoggedInitialRender] = useState(false);
  
  // Debug: Add a state to track position updates
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [positionChanged, setPositionChanged] = useState(false);

  // Log when player data changes
  useEffect(() => {
    if (!hasLoggedInitialRender) {
      console.log(`OtherPlayer initial render: Player ${player.id.substring(0, 6)} at position [${player.position.join(', ')}]`);
      setHasLoggedInitialRender(true);
    } else {
      const now = Date.now();
      console.log(`OtherPlayer update: Player ${player.id.substring(0, 6)} moved to [${player.position.join(', ')}] after ${now - lastUpdateTime}ms`);
      setLastUpdateTime(now);
      setPositionChanged(true);
      
      // Reset the "changed" flag after a short delay to enable visual feedback
      setTimeout(() => setPositionChanged(false), 200);
    }
    
    // Update target position and rotation immediately when player data changes
    targetPosition.current.set(...player.position);
    targetRotation.current.set(...player.rotation);
    currentThrottle.current = player.throttle;
  }, [player.position, player.rotation, player.id, hasLoggedInitialRender, lastUpdateTime]);
  
  // Smoothly interpolate to the target position/rotation
  useFrame((_, delta) => {
    if (!shipRef.current) return;
    
    // Interpolate position
    const lerpFactor = Math.min(delta * 10, 1); // Adjust for smoothness
    
    const currentPosition = shipRef.current.position;
    currentPosition.lerp(targetPosition.current, lerpFactor);
    
    // Interpolate rotation
    const currentRotation = shipRef.current.rotation;
    currentRotation.x += (targetRotation.current.x - currentRotation.x) * lerpFactor;
    currentRotation.y += (targetRotation.current.y - currentRotation.y) * lerpFactor;
    currentRotation.z += (targetRotation.current.z - currentRotation.z) * lerpFactor;
    
    // Update engine glow based on throttle
    if (engineGlowRef.current) {
      // Scale based on throttle (0-1)
      const scale = 0.5 + currentThrottle.current * 0.5;
      engineGlowRef.current.scale.set(scale, scale, scale * 2);
      
      // Randomize slightly for flicker effect
      const flicker = 0.9 + Math.random() * 0.2;
      engineGlowRef.current.scale.multiplyScalar(flicker);
      
      // Adjust color intensity based on throttle
      if (engineGlowRef.current.material) {
        (engineGlowRef.current.material as THREE.MeshBasicMaterial).color.setRGB(
          0.8 + currentThrottle.current * 0.2,
          0.3 + currentThrottle.current * 0.2,
          0.1 + currentThrottle.current * 0.1
        );
      }
    }
  });
  
  return (
    <group>
      {/* Debug sphere that's always visible */}
      <mesh position={player.position}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial 
          color={positionChanged ? "#ff0000" : player.color || "#ff00ff"} 
          wireframe={true} 
          opacity={0.7} 
          transparent={true} 
        />
      </mesh>
      
      <RigidBody type="fixed" colliders={false}>
        {/* Ship model */}
        <mesh
          ref={shipRef}
          geometry={nodes.model.geometry}
          material={materials.CustomMaterial}
          position={player.position}
          rotation={player.rotation}
          scale={1}
          castShadow
        >
          {/* Player name display */}
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.5}
            color={player.color}
            anchorX="center"
            anchorY="middle"
          >
            {player.id.substring(0, 6)}
          </Text>
          
          {/* Engine exhaust glow effect */}
          <mesh 
            ref={engineGlowRef}
            position={[0, 0, 5]} // Position at the back of the ship
            rotation={[0, 0, 0]}
          >
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial color="#ff5500" transparent opacity={0.8} />
          </mesh>
        </mesh>
      </RigidBody>
    </group>
  );
};

export default OtherPlayer; 