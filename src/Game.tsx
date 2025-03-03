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
const EnhancedStarField = ({ mapSize }: { mapSize: number }) => {
  return (
    <>
      {/* Distant stars - small and numerous */}
      <Stars radius={800} depth={200} count={25000} factor={4} saturation={0} fade speed={0.5} />
      
      {/* Medium distance stars - slightly larger */}
      <Stars radius={500} depth={150} count={7000} factor={8} saturation={0.5} fade speed={0.7} />
      
      {/* Nearby stars - fewer but brighter */}
      <Stars radius={300} depth={100} count={2000} factor={12} saturation={1} fade speed={1} />
      
      {/* Additional star clusters to ensure coverage around the map edges */}
      <Stars radius={mapSize * 1.5} depth={50} count={3000} factor={10} saturation={0.8} fade speed={0.3} />
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
      value: 200,
      min: 0,
      max: 1000,
      step: 20,
    },
    showMapGrid: {
      value: true,
      label: 'Show 3D Map Grid'
    }
  });

  // Define map size constants
  const MAP_SIZE = 400; // Increased from 250 to make the playable area larger

  // Game state
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [damageCooldown, setDamageCooldown] = useState(false);
  const [speed, setSpeed] = useState(0);
  
  // Add damage flash effect for the UI
  const [damageFlash, setDamageFlash] = useState(0);

  // Add state for the click-to-play message
  const [showClickToPlay, setShowClickToPlay] = useState(true);

  // Add state for monitoring throttle from SpaceFighter
  const [currentThrottle, setCurrentThrottle] = useState(0);
  
  // Add state for tracking ship orientation
  const [shipState, setShipState] = useState({
    pitch: 0,
    yaw: 0,
    roll: 0
  });

  // Function to update throttle from SpaceFighter
  const updateThrottle = (value: number) => {
    setCurrentThrottle(value);
  };
  
  // Function to update ship orientation from SpaceFighter
  const updateShipOrientation = (pitch: number, yaw: number, roll: number) => {
    setShipState({
      // Convert radians to degrees for display
      pitch: (pitch * 180 / Math.PI) % 360,
      yaw: (yaw * 180 / Math.PI) % 360,
      roll: (roll * 180 / Math.PI) % 360
    });
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
  
  // Handle general collision
  const handleCollision = () => {
    if (!damageCooldown && !gameOver) {
      // Apply smaller damage for general collisions
      setHealth(prevHealth => Math.max(0, prevHealth - 5));
      
      // Set cooldown to prevent taking damage too quickly
      setDamageCooldown(true);
      setTimeout(() => {
        setDamageCooldown(false);
      }, 1000);
    }
  };
  
  // New function to handle asteroid collision with specific damage
  const handleAsteroidDamage = (damageAmount: number) => {
    if (!damageCooldown && !gameOver) {
      console.log(`Player taking ${damageAmount}% damage from asteroid collision`);
      
      // Apply damage based on asteroid size
      setHealth(prevHealth => Math.max(0, prevHealth - damageAmount));
      
      // Show damage flash
      setDamageFlash(1.0);
      setTimeout(() => setDamageFlash(0), 500);
      
      // Set cooldown to prevent taking damage too quickly
      setDamageCooldown(true);
      setTimeout(() => {
        setDamageCooldown(false);
      }, 1500); // Longer cooldown for asteroid hits
      
      // Add screen shake or other effects here
    }
  };

  // Function to add points when an asteroid is destroyed
  const handleAsteroidDestroyed = (points: number) => {
    setScore(prevScore => prevScore + points);
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
        
        {/* Damage flash overlay */}
        {damageFlash > 0 && <div className="damage-flash"></div>}
        
        {/* Crosshair */}
        <div className="crosshair"></div>
        
        {/* Consolidated HUD Panel */}
        <div className="consolidated-hud-panel">
          {/* Ship Status Section */}
          <div className="hud-section status-section">
            <div className="hud-section-title">SHIP STATUS</div>
            <div className="status-row">
              <span>HULL:</span>
              <div className="status-bar">
                <div 
                  className={`status-bar-fill ${
                    health > 70 ? 'high-health' :
                    health > 30 ? 'medium-health' : 'low-health'
                  }`}
                  style={{ width: `${health}%` }}
                ></div>
              </div>
              <span className="status-value">{health}%</span>
            </div>
            <div className="status-row">
              <span>THROT:</span>
              <div className="status-bar">
                <div 
                  className="status-bar-fill"
                  style={{ width: `${currentThrottle}%` }}
                ></div>
              </div>
              <span className="status-value">{currentThrottle}%</span>
            </div>
            <div className="status-row">
              <span>SCORE:</span>
              <span className="status-value">{score}</span>
            </div>
          </div>
          
          {/* Orientation Section */}
          <div className="hud-section orientation-section">
            <div className="hud-section-title">ORIENTATION</div>
            <div className="orientation-values">
              <div>Pitch: <span className="value-text">{(shipState?.pitch || 0).toFixed(1)}°</span></div>
              <div>Yaw: <span className="value-text">{(shipState?.yaw || 0).toFixed(1)}°</span></div>
              <div>Roll: <span className="value-text">{(shipState?.roll || 0).toFixed(1)}°</span></div>
            </div>
          </div>
          
          {/* Controls Section */}
          <div className="hud-section controls-section">
            <div className="hud-section-title">CONTROLS</div>
            <div className="controls-grid">
              <div>↑/↓:</div><div>Pitch</div><div>←/→:</div><div>Yaw</div>
              <div>A/D:</div><div>Roll</div><div>W/S:</div><div>Throttle</div>
              <div>SHIFT:</div><div>Boost</div><div>SPACE:</div><div>Fire</div>
              <div>V:</div><div>View</div><div>R:</div><div>Reset</div>
            </div>
          </div>
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
            <SpaceFighter 
              rotation={[0, 0, 0]} 
              onThrottleChange={updateThrottle}
              onTakeDamage={handleAsteroidDamage}
              onCollision={handleCollision}
              onOrientationChange={updateShipOrientation}
            />
            
            {/* 3D Map Grid visualization */}
            {showMapGrid && (
              <>
                {/* X-Y plane (horizontal) */}
                <Grid 
                  position={[0, 0, 0]}
                  args={[MAP_SIZE * 2, MAP_SIZE * 2]} 
                  cellSize={40}
                  cellThickness={0.6}
                  cellColor="#2080ff"
                  sectionSize={200}
                  sectionThickness={1.8}
                  sectionColor="#4080ff"
                  fadeDistance={1000}
                  infiniteGrid={false}
                />
                
                {/* X-Z plane (vertical along X axis) */}
                <Grid 
                  position={[0, 0, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                  args={[MAP_SIZE * 2, MAP_SIZE * 2]}
                  cellSize={40}
                  cellThickness={0.6}
                  cellColor="#20ff80"
                  sectionSize={200}
                  sectionThickness={1.8}
                  sectionColor="#40ff80"
                  fadeDistance={1000}
                  infiniteGrid={false}
                />
                
                {/* Y-Z plane (vertical along Z axis) */}
                <Grid 
                  position={[0, 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  args={[MAP_SIZE * 2, MAP_SIZE * 2]}
                  cellSize={40}
                  cellThickness={0.6}
                  cellColor="#ff8020"
                  sectionSize={200}
                  sectionThickness={1.8}
                  sectionColor="#ff8040"
                  fadeDistance={1000}
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
            <axesHelper position={[0, 0, 0]} args={[400]} />
            <gridHelper position={[0, -20, 0]} args={[MAP_SIZE * 2, 80, 0x00ff00, 0x222222]} />
            
            {/* Additional reference objects - keep existing ones */}
            <mesh position={[100, 0, 0]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="red" />
            </mesh>
            
            <mesh position={[0, 0, 100]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="blue" />
            </mesh>
            
            <mesh position={[-100, 0, 0]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="yellow" />
            </mesh>
            
            <mesh position={[0, 0, -100]}>
              <sphereGeometry args={[5, 16, 16]} />
              <meshStandardMaterial color="purple" />
            </mesh>
            
            {/* Uncomment AsteroidField with the expanded map size */}
            {!gameOver && <AsteroidField 
              count={asteroidCount} 
              radius={MAP_SIZE} 
              onAsteroidDestroyed={handleAsteroidDestroyed}
            />}
          </Suspense>
        </Physics>
        
        <EnhancedStarField mapSize={MAP_SIZE} />
        <Environment preset="night" />
        
        <Stats />
      </Canvas>
    </>
  );
};

export default GameScene;
