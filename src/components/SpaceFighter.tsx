import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTF } from 'three-stdlib';
import { RigidBody, useRapier } from '@react-three/rapier';
import Projectile from './Projectile';

// Define the type for our GLTF result
type GLTFResult = GLTF & {
  nodes: {
    model: THREE.Mesh;
  };
  materials: {
    CustomMaterial: THREE.MeshStandardMaterial;
  };
};

interface SpaceFighterProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onThrottleChange?: (value: number) => void; // Add optional callback for throttle changes
  onTakeDamage?: (amount: number) => void; // Add callback for taking damage
  onCollision?: () => void; // Add callback for general collision detection
  onOrientationChange?: (pitch: number, yaw: number, roll: number) => void; // Add callback for orientation changes
  onPositionChange?: (position: [number, number, number], rotation: [number, number, number], throttle: number) => void; // Add callback for position changes (multiplayer)
}

// Convert SpaceFighter to use forwardRef for multiplayer functionality
const SpaceFighter = forwardRef<any, SpaceFighterProps>(({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onThrottleChange,
  onTakeDamage,
  onCollision,
  onOrientationChange,
  onPositionChange,
}, ref) => {
  // Load the ship model
  const { nodes, materials } = useGLTF('/models/ship.gltf') as GLTFResult;

  // Create references
  const groupRef = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<any>(null);
  const shipModelRef = useRef<THREE.Mesh>(null);
  
  // Movement state
  const [moveDirection, setMoveDirection] = useState({
    pitchUp: false,    // Arrow Up
    pitchDown: false,  // Arrow Down
    yawLeft: false,    // Arrow Left
    yawRight: false,   // Arrow Right
    rollLeft: false,   // A key
    rollRight: false,  // D key
    boostSpeed: false, // Shift key
  });
  
  // Add gun and projectile state
  const [isFiring, setIsFiring] = useState(false);
  const [projectiles, setProjectiles] = useState<{id: number, position: [number, number, number], direction: THREE.Vector3}[]>([]);
  const nextProjectileId = useRef(0);
  const lastFireTime = useRef(0);
  const fireRate = 200; // milliseconds between shots (5 shots per second)
  
  // Throttle system (0-100%)
  const [throttle, setThrottle] = useState(0);
  const throttleIncrement = 10; // How much to change throttle with each key press
  const maxThrottle = 100;
  
  // Add a toggle for first/third person view
  const [firstPersonView, setFirstPersonView] = useState(true);
  
  // Camera
  const { camera } = useThree();
  
  // Set first-person cockpit view
  useEffect(() => {
    // Position camera at the front of the ship for cockpit view
    camera.position.set(0, 0.5, -1); // Slightly above and in front of pivot point
    camera.lookAt(0, 0, -10); // Look forward
  }, [camera]);
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Add debug logging
      console.log('Key down:', e.key);
      
      // Prevent default behavior for these keys
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'r', 'shift', 'v'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      
      switch (e.key.toLowerCase()) {
        // Throttle controls
        case 'w':
          // Increase throttle with each press
          setThrottle(prev => Math.min(prev + throttleIncrement, maxThrottle));
          console.log('Throttle increased to:', Math.min(throttle + throttleIncrement, maxThrottle));
          break;
        case 's':
          // Decrease throttle with each press
          setThrottle(prev => Math.max(prev - throttleIncrement, 0));
          console.log('Throttle decreased to:', Math.max(throttle - throttleIncrement, 0));
          break;
        
        // Direction controls
        case 'arrowup':
          setMoveDirection(prev => ({ ...prev, pitchUp: true }));
          break;
        case 'arrowdown':
          setMoveDirection(prev => ({ ...prev, pitchDown: true }));
          break;
        case 'arrowleft':
          setMoveDirection(prev => ({ ...prev, yawLeft: true }));
          break;
        case 'arrowright':
          setMoveDirection(prev => ({ ...prev, yawRight: true }));
          break;
        
        // Roll controls
        case 'a':
          setMoveDirection(prev => ({ ...prev, rollLeft: true }));
          console.log('Roll left activated');
          break;
        case 'd':
          setMoveDirection(prev => ({ ...prev, rollRight: true }));
          console.log('Roll right activated');
          break;
        
        // Other controls  
        case 'shift':
          setMoveDirection(prev => ({ ...prev, boostSpeed: true }));
          console.log('Speed boost activated');
          break;
        case 'v':
          // Toggle between first and third person view
          setFirstPersonView(!firstPersonView);
          console.log('View switched to', firstPersonView ? 'third-person' : 'first-person');
          break;
        case 'r':
          // Reset position and throttle
          if (rigidBodyRef.current) {
            rigidBodyRef.current.setTranslation({ x: 0, y: 0, z: 0 }, true);
            rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
            
            // Reset ship rotation
            if (groupRef.current) {
              groupRef.current.rotation.set(0, 0, 0);
            }
            
            // Also reset the rotation state
            setShipRotation({ pitch: 0, yaw: 0, roll: 0 });
            
            // Reset throttle
            setThrottle(0);
            
            console.log('Ship position, rotation, and throttle reset');
          }
          break;
        
        // Add space bar for firing
        case ' ':
          setIsFiring(true);
          console.log('Firing gun');
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Add debug logging
      console.log('Key up:', e.key);
      
      switch (e.key.toLowerCase()) {
        // Direction controls - release
        case 'arrowup':
          setMoveDirection(prev => ({ ...prev, pitchUp: false }));
          break;
        case 'arrowdown':
          setMoveDirection(prev => ({ ...prev, pitchDown: false }));
          break;
        case 'arrowleft':
          setMoveDirection(prev => ({ ...prev, yawLeft: false }));
          break;
        case 'arrowright':
          setMoveDirection(prev => ({ ...prev, yawRight: false }));
          break;
        
        // Roll controls - release  
        case 'a':
          setMoveDirection(prev => ({ ...prev, rollLeft: false }));
          console.log('Roll left deactivated');
          break;
        case 'd':
          setMoveDirection(prev => ({ ...prev, rollRight: false }));
          console.log('Roll right deactivated');
          break;
        
        // Other controls - release  
        case 'shift':
          setMoveDirection(prev => ({ ...prev, boostSpeed: false }));
          console.log('Speed boost deactivated');
          break;
        
        // Release firing on space bar up
        case ' ':
          setIsFiring(false);
          console.log('Stopped firing');
          break;
      }
    };
    
    // Add focus click handler to ensure canvas has focus
    const handleCanvasClick = () => {
      console.log('Canvas clicked - should have focus now');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('click', handleCanvasClick);
    
    // Add a log to verify the event listeners are attached
    console.log('Keyboard event listeners attached');
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('click', handleCanvasClick);
      console.log('Keyboard event listeners removed');
    };
  }, [throttle, firstPersonView]);
  
  // Ship movement parameters
  const rotationSpeed = 0.03; // Reduced speed for smoother rotation
  
  // Current rotation state
  const [shipRotation, setShipRotation] = useState({ 
    pitch: 0, // X-axis rotation (up/down)
    yaw: 0,   // Y-axis rotation (left/right) 
    roll: 0   // Z-axis rotation (roll)
  });
  
  // Effect to report throttle changes to parent component
  useEffect(() => {
    if (onThrottleChange) {
      onThrottleChange(throttle);
    }
  }, [throttle, onThrottleChange]);
  
  // Function to create a new projectile
  const fireProjectile = () => {
    if (!rigidBodyRef.current) return;
    
    const now = Date.now();
    if (now - lastFireTime.current < fireRate) return; // Limit fire rate
    
    // Get the current ship position and rotation
    const shipPosition = rigidBodyRef.current.translation();
    
    // Calculate projectile direction based on ship's orientation
    const forwardDirection = new THREE.Vector3(0, 0, -1);
    const shipDirection = forwardDirection.clone().applyEuler(
      new THREE.Euler(shipRotation.pitch, shipRotation.yaw, shipRotation.roll)
    );
    
    // Create the projectile slightly ahead of the ship
    const projectilePosition: [number, number, number] = [
      shipPosition.x + shipDirection.x * 2, 
      shipPosition.y + shipDirection.y * 2, 
      shipPosition.z + shipDirection.z * 2
    ];
    
    // Add the new projectile to state
    const newProjectile = {
      id: nextProjectileId.current++,
      position: projectilePosition,
      direction: shipDirection
    };
    
    setProjectiles(prevProjectiles => [...prevProjectiles, newProjectile]);
    
    // Play gun sound effect
    // You could add sound effects here in the future
    
    // Update last fire time
    lastFireTime.current = now;
    
    console.log('Projectile fired:', newProjectile);
  };
  
  // Movement and animation logic
  useFrame((state, delta) => {
    if (!rigidBodyRef.current || !groupRef.current) return;
    
    // Check for firing
    if (isFiring) {
      fireProjectile();
    }
    
    // Calculate new rotation based on input
    let newPitch = shipRotation.pitch;
    let newYaw = shipRotation.yaw;
    let newRoll = shipRotation.roll;
    
    // Pitch (up/down) - now using arrow keys
    if (moveDirection.pitchUp) {
      // Increase rotation without limits
      newPitch -= rotationSpeed;
    } else if (moveDirection.pitchDown) {
      // Increase rotation without limits
      newPitch += rotationSpeed;
    }
    
    // Yaw (left/right) - now using arrow keys
    if (moveDirection.yawLeft) {
      // Increase rotation without limits
      newYaw += rotationSpeed;
    } else if (moveDirection.yawRight) {
      // Increase rotation without limits
      newYaw -= rotationSpeed;
    }
    
    // Roll (A/D keys)
    if (moveDirection.rollLeft) {
      // Allow more roll but with some limit for usability
      newRoll = Math.min(shipRotation.roll + rotationSpeed, Math.PI);
    } else if (moveDirection.rollRight) {
      // Allow more roll but with some limit for usability
      newRoll = Math.max(shipRotation.roll - rotationSpeed, -Math.PI);
    } else {
      // For roll only, we'll still auto-level but more gradually
      if (shipRotation.roll > 0) {
        newRoll = Math.max(0, shipRotation.roll - rotationSpeed * 0.5);
      } else if (shipRotation.roll < 0) {
        newRoll = Math.min(0, shipRotation.roll + rotationSpeed * 0.5);
      }
    }
    
    // Update ship rotation state
    setShipRotation({ pitch: newPitch, yaw: newYaw, roll: newRoll });
    
    // Apply rotation to the ship model
    groupRef.current.rotation.x = newPitch;
    groupRef.current.rotation.y = newYaw;
    groupRef.current.rotation.z = newRoll;
    
    // Get current ship position
    const shipPosition = rigidBodyRef.current.translation();
    
    // Move the ship forward in the direction it's facing - only if throttle > 0
    const forwardDirection = new THREE.Vector3(0, 0, -1);
    const shipDirection = forwardDirection.clone().applyEuler(new THREE.Euler(newPitch, newYaw, newRoll));
    
    // Scale movement by throttle percentage (0-100%)
    const throttlePercentage = throttle / 100;
    
    // Base speed and boost calculations
    const baseSpeed = 2.0 * throttlePercentage; // No movement when throttle is 0
    const boostMultiplier = moveDirection.boostSpeed ? 2.0 : 1.0;
    const finalSpeed = baseSpeed * boostMultiplier;
    
    // Calculate new position - moving where we're looking, factoring in throttle
    const newPosition = {
      x: shipPosition.x + shipDirection.x * finalSpeed,
      y: shipPosition.y + shipDirection.y * finalSpeed,
      z: shipPosition.z + shipDirection.z * finalSpeed
    };
    
    // Set the ship's new position
    rigidBodyRef.current.setTranslation(newPosition, true);
    
    // Report throttle changes to parent component
    if (onThrottleChange) {
      onThrottleChange(throttle);
    }
    
    // Report orientation changes to parent component
    if (onOrientationChange) {
      onOrientationChange(newPitch, newYaw, newRoll);
    }
    
    // Debug position occasionally
    if (Math.random() < 0.01) {
      console.log('Ship position:', newPosition);
      console.log('Ship rotation (rad):', {pitch: newPitch, yaw: newYaw, roll: newRoll});
      console.log('Ship rotation (deg):', {
        pitch: (newPitch * 180 / Math.PI) % 360,
        yaw: (newYaw * 180 / Math.PI) % 360,
        roll: (newRoll * 180 / Math.PI) % 360
      });
      console.log('Throttle:', throttle, '%');
      console.log('Speed:', finalSpeed);
    }
    
    // Camera setup based on view mode
    if (firstPersonView) {
      // First-person cockpit view
      camera.position.set(
        newPosition.x,
        newPosition.y + 0.2,
        newPosition.z
      );
      
      // Apply rotations to the camera
      camera.rotation.x = newPitch;
      camera.rotation.y = newYaw;
      camera.rotation.z = newRoll;
    } else {
      // Third-person chase view
      const cameraOffset = new THREE.Vector3(0, 3, 10);
      cameraOffset.applyEuler(new THREE.Euler(newPitch, newYaw, newRoll));
      
      camera.position.set(
        newPosition.x + cameraOffset.x,
        newPosition.y + cameraOffset.y,
        newPosition.z + cameraOffset.z
      );
      
      // Make camera look at the ship
      camera.lookAt(newPosition.x, newPosition.y, newPosition.z);
    }
  });

  // Function to handle projectile hit
  const handleProjectileHit = () => {
    console.log('Projectile hit something!');
    // Add a small score increment for hits
    // You could add UI feedback here in the future
  };
  
  // Function to remove a projectile by ID
  const removeProjectile = (id: number) => {
    setProjectiles(prevProjectiles => 
      prevProjectiles.filter(projectile => projectile.id !== id)
    );
  };

  // Add damage flash effect
  const [damageEffect, setDamageEffect] = useState(0);
  const lastCollisionTime = useRef(0);
  const collisionCooldown = 1000; // 1 second cooldown between collisions
  
  // Function to handle collision with asteroids
  const handleCollision = (other: any) => {
    const now = Date.now();
    
    // Apply cooldown to prevent multiple collisions at once
    if (now - lastCollisionTime.current < collisionCooldown) {
      return;
    }
    
    // Check if we hit an asteroid by looking for asteroidId property
    if (other && other.asteroidId !== undefined) {
      console.log("Ship collided with asteroid:", other.asteroidId);
      
      // Get the asteroid size if possible
      let asteroidSize = 1; // Default size if we can't determine
      if (typeof other.getAsteroidSize === 'function') {
        asteroidSize = other.getAsteroidSize();
      }
      
      // Calculate damage based on asteroid size
      // Larger asteroids cause more damage (50-100% for large, less for small)
      const baseDamage = asteroidSize >= 1.0 ? 
        Math.floor(Math.random() * 51) + 50 : // 50-100% for large asteroids
        Math.floor(asteroidSize * 50); // Scaled damage for smaller asteroids/fragments
      
      console.log(`Taking ${baseDamage}% damage from asteroid of size ${asteroidSize}`);
      
      // Apply damage effect
      setDamageEffect(1.0);
      
      // Call damage callback
      if (onTakeDamage) {
        onTakeDamage(baseDamage);
      }
      
      // General collision notification
      if (onCollision) {
        onCollision();
      }
      
      // Set cooldown timestamp
      lastCollisionTime.current = now;
    }
  };
  
  // Reset damage effect after a short time
  useEffect(() => {
    if (damageEffect > 0) {
      const timer = setTimeout(() => {
        setDamageEffect(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [damageEffect]);

  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    // Method to set the fighter's position (used when respawning)
    setPosition: (newPosition: [number, number, number]) => {
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setTranslation(
          { x: newPosition[0], y: newPosition[1], z: newPosition[2] },
          true
        );
      }
    },
    // Can add more methods here as needed
  }));
  
  // Update position for multiplayer
  useFrame(() => {
    if (rigidBodyRef.current && onPositionChange) {
      const worldPosition = rigidBodyRef.current.translation();
      const worldRotation = groupRef.current ? [
        groupRef.current.rotation.x,
        groupRef.current.rotation.y,
        groupRef.current.rotation.z
      ] as [number, number, number] : rotation;
      
      onPositionChange(
        [worldPosition.x, worldPosition.y, worldPosition.z],
        worldRotation,
        throttle
      );
    }
  });

  return (
    <>
      {/* Render all active projectiles */}
      {projectiles.map(projectile => (
        <Projectile
          key={projectile.id}
          position={projectile.position}
          direction={projectile.direction}
          damageAmount={10} // Increased damage to make destruction more obvious
          speed={50} // Faster projectiles
          onHit={() => {
            handleProjectileHit();
            removeProjectile(projectile.id);
          }}
        />
      ))}
      
      <RigidBody
        ref={rigidBodyRef}
        position={position}
        type="dynamic"
        colliders="cuboid"
        linearDamping={0.5}
        angularDamping={0.5}
        onIntersectionEnter={({ other }) => {
          // Check if what we hit has properties
          // @ts-ignore - accessing custom properties
          if (other && other.rigidBody) {
            // @ts-ignore - accessing custom properties
            handleCollision(other.rigidBody);
          }
        }}
      >
        <group
          ref={groupRef}
          scale={scale}
        >
          <mesh
            ref={shipModelRef}
            geometry={nodes.model.geometry}
            material={materials.CustomMaterial}
            castShadow
            receiveShadow
            // Only hide the ship model in first-person view
            visible={!firstPersonView}
          />
          
          {/* Simple spaceship model for debugging in third-person view */}
          {!firstPersonView && (
            <>
              <mesh position={[0, 0, 0]}>
                <coneGeometry args={[0.5, 2, 8]} />
                <meshStandardMaterial color="cyan" />
              </mesh>
              <mesh position={[0, 0, 0.5]}>
                <boxGeometry args={[1.2, 0.2, 1]} />
                <meshStandardMaterial color="gray" />
              </mesh>
            </>
          )}
          
          {/* Damage effect overlay */}
          {damageEffect > 0 && (
            <pointLight 
              color="#ff0000" 
              intensity={damageEffect * 5} 
              distance={3} 
              position={[0, 0, 0]}
            />
          )}
        </group>
      </RigidBody>
    </>
  );
});

// Preload the model to avoid loading during gameplay
useGLTF.preload('/models/ship.gltf');

export default SpaceFighter;
