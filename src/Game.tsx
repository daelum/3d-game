import { Physics, RigidBody, CuboidCollider, RapierRigidBody, useRapier } from '@react-three/rapier';
import { Stats, useGLTF, Stars, Environment, Sky, Grid } from '@react-three/drei';
import SpaceFighter from './components/SpaceFighter';
import AsteroidField from './components/AsteroidField'; // Uncommented to use it
import { useControls } from 'leva';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useState, useEffect, useRef } from 'react';

useGLTF.preload('/models/ship.gltf');

// Simplified collision detector with console logging
const CollisionDetector = ({ onCollision }: { onCollision: () => void }) => {
  // Use a timer-based approach instead of rapier collision detection for now
  useEffect(() => {
    const collisionCheckInterval = setInterval(() => {
      // For debugging purposes, just log that we're checking for collisions
      console.log('Checking for collisions...');
    }, 2000);
    
    return () => clearInterval(collisionCheckInterval);
  }, []);
  
  return null;
};

// Enhanced StarField that creates a more immersive space environment
const EnhancedStarField = () => {
  return (
    <>
      {/* Distant stars - small and numerous */}
      <Stars radius={300} depth={100} count={10000} factor={4} saturation={0} fade speed={0.5} />
      
      {/* Medium distance stars - slightly larger */}
      <Stars radius={150} depth={50} count={2000} factor={8} saturation={0.5} fade speed={0.7} />
      
      {/* Nearby stars - fewer but brighter */}
      <Stars radius={70} depth={25} count={500} factor={12} saturation={1} fade speed={1} />
    </>
  );
};

const GameScene = () => {
  const { intensity, asteroidCount, showMapGrid } = useControls('Environment', {
    intensity: {
      value: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
    },
    asteroidCount: {
      value: 40,
      min: 0,
      max: 200,
      step: 5,
    },
    showMapGrid: {
      value: true,
      label: 'Show 3D Map Grid'
    }
  });

  // Define map size constants
  const MAP_SIZE = 250; // To match the asteroid reset limit

  // Game state
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [damageCooldown, setDamageCooldown] = useState(false);
  const [speed, setSpeed] = useState(0);

  // Add state for the click-to-play message
  const [showClickToPlay, setShowClickToPlay] = useState(true);

  // Add state for monitoring throttle from SpaceFighter
  const [currentThrottle, setCurrentThrottle] = useState(0);
  
  // Function to update throttle from SpaceFighter
  const updateThrottle = (value: number) => {
    setCurrentThrottle(value);
  };

  // Increment score based on distance traveled (speed)
  useEffect(() => {
    if (!gameOver) {
      const timer = setInterval(() => {
        setScore(prevScore => prevScore + Math.floor(1 + speed * 0.5));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [gameOver, speed]);

  // Handle game over
  useEffect(() => {
    if (health <= 0) {
      setGameOver(true);
    }
  }, [health]);

  // Restart game
  const restartGame = () => {
    setScore(0);
    setHealth(100);
    setGameOver(false);
  };
  
  // Handle collision
  const handleCollision = () => {
    if (!damageCooldown && !gameOver) {
      // Apply damage
      setHealth(prevHealth => Math.max(0, prevHealth - 10));
      
      // Set cooldown to prevent taking damage too quickly
      setDamageCooldown(true);
      setTimeout(() => {
        setDamageCooldown(false);
      }, 1000);
    }
  };

  // Handle focus on the canvas
  const handleCanvasFocus = () => {
    setShowClickToPlay(false);
    console.log('Canvas focused - controls enabled');
  };

  // Add console log for debugging
  useEffect(() => {
    console.log("Game scene mounted - rendering 3D elements");
    // Clean up on unmount
    return () => {
      console.log("Game scene unmounting");
    };
  }, []);

  return (
    <>
      <div className="game-ui">
        {/* Cockpit HUD effect */}
        <div className="cockpit-hud"></div>
        
        {/* Crosshair */}
        <div className="crosshair"></div>
        
        <div className="score">Score: {score}</div>
        
        <div className="health-bar">
          <div 
            className="health-bar-fill" 
            style={{ width: `${health}%` }}
          ></div>
        </div>
        
        {/* Add throttle display */}
        <div className="throttle-indicator">
          <div className="throttle-label">THROTTLE</div>
          <div className="throttle-bar">
            <div 
              className="throttle-bar-fill" 
              style={{ width: `${currentThrottle}%` }}
            ></div>
          </div>
          <div className="throttle-value">{currentThrottle}%</div>
        </div>
        
        <div className="controls-help">
          <p>↑/↓: Pitch Up/Down</p>
          <p>←/→: Yaw Left/Right</p>
          <p>A/D: Roll Left/Right</p>
          <p>W: Increase Throttle</p>
          <p>S: Decrease Throttle</p>
          <p>SHIFT: Boost Speed</p>
          <p>V: Toggle View</p>
          <p>R: Reset Ship</p>
        </div>
        
        {gameOver && (
          <div className="game-over visible">
            <h2>GAME OVER</h2>
            <p>Final Score: {score}</p>
            <button className="restart-button" onClick={restartGame}>
              RESTART
            </button>
          </div>
        )}
        
        {/* Click to play message */}
        {showClickToPlay && (
          <div className="click-to-play">
            CLICK ON SCREEN TO ENABLE CONTROLS
          </div>
        )}
      </div>
      
      <Canvas
        gl={{
          antialias: true,
          powerPreference: "high-performance"
        }}
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 10] }}
        style={{ background: '#000000' }}
        tabIndex={0}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          e.currentTarget.focus();
          handleCanvasFocus();
        }}
        onFocus={() => handleCanvasFocus()}
      >
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 50, 600]} />
        <ambientLight intensity={intensity} />
        
        {/* Add distant light sources to simulate stars */}
        <pointLight position={[100, 100, 100]} intensity={0.5} />
        <pointLight position={[-100, -100, -100]} intensity={0.5} />
        <pointLight position={[-100, 100, -100]} intensity={0.5} />
        
        <Physics debug={true} timeStep="vary" gravity={[0, 0, 0]}>
          <CollisionDetector onCollision={handleCollision} />
          <Suspense fallback={null}>
            <SpaceFighter rotation={[0, 0, 0]} onThrottleChange={updateThrottle} />
            
            {/* 3D Map Grid visualization */}
            {showMapGrid && (
              <>
                {/* X-Y plane (horizontal) */}
                <Grid 
                  position={[0, 0, 0]}
                  args={[MAP_SIZE * 2, MAP_SIZE * 2]} 
                  cellSize={20}
                  cellThickness={0.5}
                  cellColor="#2080ff"
                  sectionSize={100}
                  sectionThickness={1.5}
                  sectionColor="#4080ff"
                  fadeDistance={600}
                  infiniteGrid={false}
                />
                
                {/* X-Z plane (vertical along X axis) */}
                <Grid 
                  position={[0, 0, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                  args={[MAP_SIZE * 2, MAP_SIZE * 2]}
                  cellSize={20}
                  cellThickness={0.5}
                  cellColor="#20ff80"
                  sectionSize={100}
                  sectionThickness={1.5}
                  sectionColor="#40ff80"
                  fadeDistance={600}
                  infiniteGrid={false}
                />
                
                {/* Y-Z plane (vertical along Z axis) */}
                <Grid 
                  position={[0, 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  args={[MAP_SIZE * 2, MAP_SIZE * 2]}
                  cellSize={20}
                  cellThickness={0.5}
                  cellColor="#ff8020"
                  sectionSize={100}
                  sectionThickness={1.5}
                  sectionColor="#ff8040"
                  fadeDistance={600}
                  infiniteGrid={false}
                />
                
                {/* Create boundary markers at the corners of map */}
                <mesh position={[MAP_SIZE, MAP_SIZE, MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
                </mesh>
                
                <mesh position={[-MAP_SIZE, MAP_SIZE, MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="green" emissive="green" emissiveIntensity={0.5} />
                </mesh>
                
                <mesh position={[MAP_SIZE, MAP_SIZE, -MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="blue" emissive="blue" emissiveIntensity={0.5} />
                </mesh>
                
                <mesh position={[-MAP_SIZE, MAP_SIZE, -MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={0.5} />
                </mesh>
                
                <mesh position={[MAP_SIZE, -MAP_SIZE, MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="purple" emissive="purple" emissiveIntensity={0.5} />
                </mesh>
                
                <mesh position={[-MAP_SIZE, -MAP_SIZE, MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="cyan" emissive="cyan" emissiveIntensity={0.5} />
                </mesh>
                
                <mesh position={[MAP_SIZE, -MAP_SIZE, -MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="magenta" emissive="magenta" emissiveIntensity={0.5} />
                </mesh>
                
                <mesh position={[-MAP_SIZE, -MAP_SIZE, -MAP_SIZE]}>
                  <sphereGeometry args={[5, 16, 16]} />
                  <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
                </mesh>
              </>
            )}
            
            {/* Visual debug helpers - keep existing ones */}
            <axesHelper position={[0, 0, 0]} args={[200]} />
            <gridHelper position={[0, -20, 0]} args={[500, 50, 0x00ff00, 0x222222]} />
            
            {/* Additional reference objects - keep existing ones */}
            <mesh position={[50, 0, 0]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="red" />
            </mesh>
            
            <mesh position={[0, 0, 50]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="blue" />
            </mesh>
            
            <mesh position={[-50, 0, 0]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="yellow" />
            </mesh>
            
            <mesh position={[0, 0, -50]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="purple" />
            </mesh>
            
            {/* Uncomment AsteroidField with the expanded map size */}
            {!gameOver && <AsteroidField count={asteroidCount} radius={MAP_SIZE} />}
          </Suspense>
        </Physics>
        
        <EnhancedStarField />
        <Environment preset="night" />
        
        <Stats />
      </Canvas>
    </>
  );
};

export default GameScene;
