import { Physics, RigidBody, CuboidCollider, RapierRigidBody, useRapier } from '@react-three/rapier';
import { Stats, useGLTF, Stars, Environment, Sky, Grid } from '@react-three/drei';
import { Perf } from 'r3f-perf';
import SpaceFighter from './components/SpaceFighter';
import AsteroidField from './components/AsteroidField'; // Uncommented to use it
import { useControls } from 'leva';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useState, useEffect, useRef } from 'react';
import socketService, { PlayerData, ProjectileData } from './services/SocketService';
import OtherPlayer from './components/OtherPlayer';
import DebugPanel from './components/DebugPanel';

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
const EnhancedStarField = ({ mapSize, quality = 'medium' }: { mapSize: number, quality?: string }) => {
  // Scale star counts based on quality setting
  const getStarCount = (baseCount: number) => {
    switch (quality) {
      case 'low': return Math.floor(baseCount * 0.3);
      case 'medium': return Math.floor(baseCount * 0.6);
      case 'high': return baseCount;
      default: return Math.floor(baseCount * 0.6);
    }
  };

  return (
    <>
      {/* Distant stars - small and numerous */}
      <Stars radius={800} depth={200} count={getStarCount(25000)} factor={4} saturation={0} fade speed={0.5} />
      
      {/* Medium distance stars - slightly larger */}
      <Stars radius={500} depth={150} count={getStarCount(7000)} factor={8} saturation={0.5} fade speed={0.7} />
      
      {/* Nearby stars - fewer but brighter */}
      <Stars radius={300} depth={100} count={getStarCount(2000)} factor={12} saturation={1} fade speed={1} />
      
      {/* Additional star clusters to ensure coverage around the map edges */}
      <Stars radius={mapSize * 1.5} depth={50} count={getStarCount(3000)} factor={10} saturation={0.8} fade speed={0.3} />
    </>
  );
};

const GameScene = () => {
  const { intensity, asteroidCount, showMapGrid, graphicsQuality } = useControls('Environment', {
    intensity: {
      value: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
    },
    asteroidCount: {
      value: 100,
      min: 0,
      max: 1000,
      step: 20,
    },
    showMapGrid: {
      value: false,
      label: 'Show 3D Map Grid'
    },
    graphicsQuality: {
      value: 'medium',
      options: ['low', 'medium', 'high'],
      label: 'Graphics Quality'
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

  // Fix the data structure for otherPlayers state
  const [otherPlayers, setOtherPlayers] = useState<Map<string, PlayerData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const shipRef = useRef<any>(null);
  const localPlayerId = useRef<string>('');
  const lastPositionUpdate = useRef<number>(0);
  const POSITION_UPDATE_INTERVAL = 50; // milliseconds between position updates
  const [multiplayerReady, setMultiplayerReady] = useState(false);
  
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
  
  // Initialize socket connection - MOVE THIS OUTSIDE THE CONDITIONAL
  useEffect(() => {
    // Connect to the socket server immediately, regardless of game focus
    console.log("Initializing socket connection...");
    socketService.connect();
    
    // Add connection status listener
    const unsubscribeConnection = socketService.on('connectionChange', (connected: boolean) => {
      console.log(`Socket connection status changed: ${connected ? 'connected' : 'disconnected'}`);
      setIsConnected(connected);
      if (connected) {
        // Only set the player ID after we're connected
        localPlayerId.current = socketService.getSocketId();
        console.log(`Connected to server with ID: ${localPlayerId.current}`);
      }
    });
    
    // Set up socket event listeners
    const onPlayers = (players: PlayerData[]) => {
      const newPlayers = new Map<string, PlayerData>();
      
      players.forEach(player => {
        if (player.id !== localPlayerId.current) {
          newPlayers.set(player.id, player);
        }
      });
      
      setOtherPlayers(newPlayers);
      setMultiplayerReady(true);
    };
    
    const onPlayerJoined = (player: PlayerData) => {
      if (player.id !== localPlayerId.current) {
        setOtherPlayers(prev => {
          const newMap = new Map(prev);
          newMap.set(player.id, player);
          return newMap;
        });
      }
    };
    
    const onPlayerMoved = (data: {
      id: string;
      position: [number, number, number];
      rotation: [number, number, number];
      throttle: number;
    }) => {
      if (data.id !== localPlayerId.current) {
        setOtherPlayers(prev => {
          const newMap = new Map(prev);
          const player = newMap.get(data.id);
          
          if (player) {
            newMap.set(data.id, {
              ...player,
              position: data.position,
              rotation: data.rotation,
              throttle: data.throttle
            });
          }
          
          return newMap;
        });
      }
    };
    
    const onPlayerLeft = (playerId: string) => {
      setOtherPlayers(prev => {
        const newMap = new Map(prev);
        newMap.delete(playerId);
        return newMap;
      });
    };
    
    const onProjectileFired = (data: ProjectileData) => {
      // Handle projectile fired by other players
      // This would instantiate a projectile in the 3D scene
      console.log('Projectile fired by another player:', data);
    };
    
    const onPlayerHealthUpdated = (data: { id: string; health: number }) => {
      if (data.id === localPlayerId.current) {
        // Update local player health
        setHealth(data.health);
      } else {
        // Update other player's health
        setOtherPlayers(prev => {
          const newMap = new Map(prev);
          const player = newMap.get(data.id);
          
          if (player) {
            newMap.set(data.id, {
              ...player,
              health: data.health
            });
          }
          
          return newMap;
        });
      }
    };
    
    const onPlayerEliminated = (data: { id: string; eliminatedBy: string }) => {
      if (data.eliminatedBy === localPlayerId.current) {
        // If we eliminated someone, increment our score
        setScore(prevScore => prevScore + 10);
      }
    };
    
    const onPlayerScoreUpdated = (data: { id: string; score: number }) => {
      if (data.id === localPlayerId.current) {
        // Update local player score
        setScore(data.score);
      } else {
        // Update other player's score
        setOtherPlayers(prev => {
          const newMap = new Map(prev);
          const player = newMap.get(data.id);
          
          if (player) {
            newMap.set(data.id, {
              ...player,
              score: data.score
            });
          }
          
          return newMap;
        });
      }
    };
    
    const onRespawn = (data: { position: [number, number, number]; health: number }) => {
      // Reset player position and health after being eliminated
      if (shipRef.current) {
        shipRef.current.setPosition(data.position);
      }
      setHealth(data.health);
    };
    
    // Register all event listeners
    const unsubscribePlayers = socketService.on('players', onPlayers);
    const unsubscribePlayerJoined = socketService.on('playerJoined', onPlayerJoined);
    const unsubscribePlayerMoved = socketService.on('playerMoved', onPlayerMoved);
    const unsubscribePlayerLeft = socketService.on('playerLeft', onPlayerLeft);
    const unsubscribeProjectileFired = socketService.on('projectileFired', onProjectileFired);
    const unsubscribePlayerHealthUpdated = socketService.on('playerHealthUpdated', onPlayerHealthUpdated);
    const unsubscribePlayerEliminated = socketService.on('playerEliminated', onPlayerEliminated);
    const unsubscribePlayerScoreUpdated = socketService.on('playerScoreUpdated', onPlayerScoreUpdated);
    const unsubscribeRespawn = socketService.on('respawn', onRespawn);
    
    // Clean up listeners on unmount
    return () => {
      unsubscribeConnection();
      unsubscribePlayers();
      unsubscribePlayerJoined();
      unsubscribePlayerMoved();
      unsubscribePlayerLeft();
      unsubscribeProjectileFired();
      unsubscribePlayerHealthUpdated();
      unsubscribePlayerEliminated();
      unsubscribePlayerScoreUpdated();
      unsubscribeRespawn();
      
      socketService.disconnect();
      setIsConnected(false);
      console.log("Cleaning up socket connection");
    };
  }, []); // Empty dependency array to ensure this only runs once
  
  // Update the server with the player's position
  const updatePosition = (position: [number, number, number], rotation: [number, number, number], throttle: number) => {
    const now = Date.now();
    
    // Throttle position updates to avoid flooding the server
    if (now - lastPositionUpdate.current > POSITION_UPDATE_INTERVAL) {
      socketService.updatePosition(position, rotation, throttle);
      lastPositionUpdate.current = now;
    }
  };
  
  // Modified handleCollision to report damage to the server
  const handleCollision = () => {
    if (damageCooldown || gameOver) return;
    
    const damageAmount = 20; // Fixed damage amount for any collision
    
    // Report damage to server
    socketService.reportDamage(damageAmount);
    
    setDamageCooldown(true);
    setDamageFlash(1);
    
    // Local state update for responsive feedback
    const newHealth = Math.max(0, health - damageAmount);
    setHealth(newHealth);
    
    if (newHealth <= 0 && !gameOver) {
      setGameOver(true);
    }
    
    setTimeout(() => {
      setDamageCooldown(false);
    }, 1000);
  };
  
  // Modified handleAsteroidDamage to report to the server
  const handleAsteroidDamage = (damageAmount: number) => {
    if (damageCooldown || gameOver) return;
    
    // Report damage to server
    socketService.reportDamage(damageAmount);
    
    setDamageCooldown(true);
    setDamageFlash(1);
    
    // Local state update for responsive feedback
    const newHealth = Math.max(0, health - damageAmount);
    setHealth(newHealth);
    
    if (newHealth <= 0 && !gameOver) {
      setGameOver(true);
    }
    
    setTimeout(() => {
      setDamageCooldown(false);
    }, 1000);
  };
  
  // Modified handleAsteroidDestroyed to report to the server
  const handleAsteroidDestroyed = (points: number) => {
    // Report destroyed asteroid to server
    socketService.reportAsteroidDestroyed(points);
    
    // Local state update for responsive feedback
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

  // Make sure to update our position regularly
  useEffect(() => {
    if (!shipRef.current || !isConnected) return;
    
    const interval = setInterval(() => {
      const position = shipRef.current.position.toArray() as [number, number, number];
      const rotation = [
        shipRef.current.rotation.x,
        shipRef.current.rotation.y,
        shipRef.current.rotation.z
      ] as [number, number, number];
      
      // Call the server update method
      socketService.updatePosition(position, rotation, currentThrottle);
      
      // Log position updates occasionally
      if (Math.random() < 0.05) { // Only log 5% of updates to avoid spam
        console.log(`Sending position update: ${position}`);
      }
    }, 50); // Send updates every 50ms
    
    return () => clearInterval(interval);
  }, [shipRef, isConnected, currentThrottle]);

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
          antialias: graphicsQuality !== 'low',
          powerPreference: "high-performance",
          precision: graphicsQuality === 'low' ? 'lowp' : 'highp',
          alpha: false,
          stencil: false
        }}
        frameloop={graphicsQuality === 'high' ? 'always' : 'demand'}
        dpr={graphicsQuality === 'low' ? 1 : window.devicePixelRatio}
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
        
        <pointLight position={[100, 100, 100]} intensity={0.5} />
        <pointLight position={[-100, -100, -100]} intensity={0.5} />
        
        <Physics debug={false} timeStep="vary" gravity={[0, 0, 0]} colliders={false}>
          <CollisionDetector onCollision={handleCollision} />
          <Suspense fallback={null}>
            {/* Add rendering of other players if multiplayer is ready */}
            {multiplayerReady && Array.from(otherPlayers.values()).map(player => (
              <OtherPlayer key={player.id} player={player} />
            ))}
            
            <SpaceFighter
              ref={shipRef}
              position={[0, 0, 0]}
              onThrottleChange={updateThrottle}
              onTakeDamage={handleAsteroidDamage}
              onCollision={handleCollision}
              onOrientationChange={updateShipOrientation}
              onPositionChange={updatePosition} // New prop to report position to server
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
              quality={graphicsQuality}
            />}
          </Suspense>
        </Physics>
        
        <EnhancedStarField mapSize={MAP_SIZE} quality={graphicsQuality} />
        <Environment preset="night" />
        
        {/* Show performance stats */}
        <Stats showPanel={0} className="stats-panel" />
      </Canvas>
      
      <DebugPanel 
        isConnected={isConnected} 
        localPlayerId={localPlayerId.current || ""} 
        otherPlayers={otherPlayers} 
      />
    </>
  );
};

export default GameScene;
