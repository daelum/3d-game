import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CelestialBodyProps {
  mapSize: number;
}

interface CelestialBody {
  name: string;
  position: [number, number, number];
  size: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  rotationSpeed: number;
  atmosphereColor: string;
  hasRings?: boolean;
  ringColor?: string;
  ringSize?: number;
  ringRotation?: number;
  surfaceDetail?: number;
  flattening?: number;
}

const CelestialBodies: React.FC<CelestialBodyProps> = ({ mapSize }) => {
  const { camera } = useThree();
  const frustum = useRef(new THREE.Frustum());
  const projScreenMatrix = useRef(new THREE.Matrix4());
  
  // References for rotation animation
  const celestialRefs = useRef<THREE.Group[]>([]);
  const ringRefs = useRef<THREE.Mesh[]>([]);

  // Define celestial bodies with their properties
  const celestialBodies: CelestialBody[] = [
    {
      name: 'Blue Giant',
      position: [mapSize * 0.9, mapSize * 0.6, mapSize * 0.9],
      size: 45,
      color: '#4169E1',
      emissive: '#1E90FF',
      emissiveIntensity: 2,
      rotationSpeed: 0.0005,
      atmosphereColor: '#87CEEB',
      surfaceDetail: 64,
      flattening: 0.1
    },
    {
      name: 'Red Dwarf',
      position: [-mapSize * 0.8, mapSize * 0.7, -mapSize * 0.8],
      size: 25,
      color: '#CD5C5C',
      emissive: '#FF6347',
      emissiveIntensity: 1.5,
      rotationSpeed: 0.001,
      atmosphereColor: '#FA8072',
      surfaceDetail: 32
    },
    {
      name: 'Purple Nebula Core',
      position: [mapSize * 0.85, -mapSize * 0.7, -mapSize * 0.85],
      size: 50,
      color: '#9370DB',
      emissive: '#8A2BE2',
      emissiveIntensity: 1.8,
      rotationSpeed: 0.0003,
      atmosphereColor: '#DDA0DD',
      surfaceDetail: 48
    },
    {
      name: 'Golden Gas Giant',
      position: [-mapSize * 0.9, -mapSize * 0.8, mapSize * 0.9],
      size: 55,
      color: '#DAA520',
      emissive: '#FFD700',
      emissiveIntensity: 1.2,
      rotationSpeed: 0.0007,
      atmosphereColor: '#F0E68C',
      hasRings: true,
      ringColor: '#FFF8DC',
      ringSize: 1.8,
      ringRotation: 0.3,
      surfaceDetail: 64,
      flattening: 0.06
    },
    {
      name: 'Emerald Pulsar',
      position: [0, mapSize * 0.95, mapSize * 0.95],
      size: 30,
      color: '#2E8B57',
      emissive: '#00FF7F',
      emissiveIntensity: 2.5,
      rotationSpeed: 0.002,
      atmosphereColor: '#98FB98',
      surfaceDetail: 48
    },
    {
      name: 'Crimson Giant',
      position: [mapSize * 0.95, 0, -mapSize * 0.95],
      size: 60,
      color: '#DC143C',
      emissive: '#FF0000',
      emissiveIntensity: 1.7,
      rotationSpeed: 0.0004,
      atmosphereColor: '#FFB6C1',
      hasRings: true,
      ringColor: '#FFE4E1',
      ringSize: 1.6,
      ringRotation: -0.2,
      surfaceDetail: 64,
      flattening: 0.08
    },
    {
      name: 'Azure Neutron Star',
      position: [-mapSize * 0.95, mapSize * 0.95, 0],
      size: 20,
      color: '#007FFF',
      emissive: '#00BFFF',
      emissiveIntensity: 3,
      rotationSpeed: 0.003,
      atmosphereColor: '#87CEEB',
      surfaceDetail: 32
    },
    {
      name: 'Amber Binary',
      position: [0, -mapSize * 0.95, -mapSize * 0.95],
      size: 40,
      color: '#FFD700',
      emissive: '#FFA500',
      emissiveIntensity: 2,
      rotationSpeed: 0.0008,
      atmosphereColor: '#FFDAB9',
      hasRings: true,
      ringColor: '#DEB887',
      ringSize: 1.7,
      ringRotation: 0.4,
      surfaceDetail: 48,
      flattening: 0.05
    },
    {
      name: 'Violet Quasar',
      position: [-mapSize * 0.95, -mapSize * 0.95, -mapSize * 0.95],
      size: 35,
      color: '#8A2BE2',
      emissive: '#9400D3',
      emissiveIntensity: 2.8,
      rotationSpeed: 0.0015,
      atmosphereColor: '#DDA0DD',
      surfaceDetail: 48
    },
    {
      name: 'Teal Supernova',
      position: [mapSize * 0.95, mapSize * 0.95, mapSize * 0.95],
      size: 50,
      color: '#008080',
      emissive: '#40E0D0',
      emissiveIntensity: 2.2,
      rotationSpeed: 0.0006,
      atmosphereColor: '#AFEEEE',
      hasRings: true,
      ringColor: '#B0E0E6',
      ringSize: 2,
      ringRotation: -0.1,
      surfaceDetail: 64,
      flattening: 0.07
    }
  ];

  // Modify boundary bodies to be simpler
  const boundaryBodies: CelestialBody[] = [
    {
      name: 'Alpha Nebula',
      position: [1800, 0, 0],
      size: 200,
      color: '#FF4500',
      emissive: '#FF6347',
      emissiveIntensity: 4,
      rotationSpeed: 0.0001,
      atmosphereColor: '#FFE4B5',
      surfaceDetail: 16
    },
    {
      name: 'Beta Quasar',
      position: [-1800, 0, 0],
      size: 180,
      color: '#4B0082',
      emissive: '#8A2BE2',
      emissiveIntensity: 3,
      rotationSpeed: 0.0001,
      atmosphereColor: '#E6E6FA',
      surfaceDetail: 32
    },
    {
      name: 'Gamma Supernova',
      position: [0, 1800, 0],
      size: 220,
      color: '#00CED1',
      emissive: '#00FFFF',
      emissiveIntensity: 3,
      rotationSpeed: 0.0001,
      atmosphereColor: '#AFEEEE',
      surfaceDetail: 32
    },
    {
      name: 'Delta Void',
      position: [0, -1800, 0],
      size: 190,
      color: '#2F4F4F',
      emissive: '#696969',
      emissiveIntensity: 2,
      rotationSpeed: 0.0001,
      atmosphereColor: '#778899',
      surfaceDetail: 32
    },
    {
      name: 'Epsilon Cluster',
      position: [0, 0, 1800],
      size: 210,
      color: '#FFD700',
      emissive: '#FFA500',
      emissiveIntensity: 3,
      rotationSpeed: 0.0001,
      atmosphereColor: '#F0E68C',
      surfaceDetail: 32
    },
    {
      name: 'Omega Nexus',
      position: [0, 0, -1800],
      size: 230,
      color: '#9932CC',
      emissive: '#8B008B',
      emissiveIntensity: 3,
      rotationSpeed: 0.0001,
      atmosphereColor: '#DDA0DD',
      surfaceDetail: 32
    }
  ];

  const allCelestialBodies = [...celestialBodies, ...boundaryBodies];

  // Update frustum culling matrix
  useFrame(() => {
    projScreenMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.current.setFromProjectionMatrix(projScreenMatrix.current);

    // Rotate bodies
    celestialRefs.current.forEach((group, index) => {
      if (group) {
        group.rotation.y += allCelestialBodies[index].rotationSpeed;
        if (allCelestialBodies[index].hasRings && ringRefs.current[index]) {
          ringRefs.current[index].rotation.z += allCelestialBodies[index].rotationSpeed * 0.5;
        }
      }
    });
  });

  const renderCelestialBody = (body: CelestialBody, index: number) => {
    const isBoundaryBody = boundaryBodies.includes(body);
    const position = new THREE.Vector3(...body.position);
    
    // Skip rendering if outside frustum
    if (!frustum.current.containsPoint(position)) {
      return null;
    }

    // Calculate distance to camera
    const distanceToCamera = position.distanceTo(camera.position);
    
    return (
      <group
        key={body.name}
        position={body.position}
        ref={(el) => {
          if (el) celestialRefs.current[index] = el;
        }}
      >
        {/* Level of Detail handling */}
        <group>
          {distanceToCamera < 1000 ? (
            // High detail
            <mesh>
              <sphereGeometry args={[body.size, body.surfaceDetail || 32, body.surfaceDetail || 32]} />
              <meshStandardMaterial
                color={body.color}
                emissive={body.emissive}
                emissiveIntensity={body.emissiveIntensity}
                roughness={0.7}
                metalness={0.3}
                bumpScale={0.5}
              />
            </mesh>
          ) : distanceToCamera < 2000 ? (
            // Medium detail
            <mesh>
              <sphereGeometry args={[body.size, 16, 16]} />
              <meshStandardMaterial
                color={body.color}
                emissive={body.emissive}
                emissiveIntensity={body.emissiveIntensity}
                roughness={0.7}
                metalness={0.3}
              />
            </mesh>
          ) : (
            // Low detail
            <mesh>
              <sphereGeometry args={[body.size, 8, 8]} />
              <meshStandardMaterial
                color={body.color}
                emissive={body.emissive}
                emissiveIntensity={body.emissiveIntensity * 1.5}
                roughness={0.7}
              />
            </mesh>
          )}
        </group>

        {/* Only render atmosphere and details for nearby regular bodies */}
        {!isBoundaryBody && distanceToCamera < 1000 && (
          <>
            {/* Atmosphere effect */}
            <mesh scale={1.2}>
              <sphereGeometry args={[body.size, 16, 16]} />
              <meshStandardMaterial
                color={body.atmosphereColor}
                transparent
                opacity={0.3}
                side={THREE.BackSide}
              />
            </mesh>

            {/* Rings */}
            {body.hasRings && (
              <mesh
                rotation={[Math.PI / 2 + (body.ringRotation || 0), 0, 0]}
                ref={(el) => {
                  if (el) ringRefs.current[index] = el;
                }}
              >
                <ringGeometry args={[body.size * 1.3, body.size * (body.ringSize || 1.6), 32]} />
                <meshStandardMaterial
                  color={body.ringColor}
                  transparent
                  opacity={0.8}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </>
        )}

        {/* Single light for all bodies, with distance-based intensity */}
        <pointLight
          color={body.emissive}
          intensity={body.emissiveIntensity * (distanceToCamera > 1000 ? 3 : 2)}
          distance={body.size * 15}
          decay={2}
        />

        {/* Additional lights only for nearby regular bodies with rings */}
        {!isBoundaryBody && body.hasRings && distanceToCamera < 1000 && (
          <>
            <pointLight
              position={[0, body.size * 2, 0]}
              color={body.emissive}
              intensity={body.emissiveIntensity}
              distance={body.size * 10}
              decay={2}
            />
            <pointLight
              position={[0, -body.size * 2, 0]}
              color={body.emissive}
              intensity={body.emissiveIntensity}
              distance={body.size * 10}
              decay={2}
            />
          </>
        )}
      </group>
    );
  };

  return (
    <>
      {allCelestialBodies.map((body, index) => renderCelestialBody(body, index))}
    </>
  );
};

export default CelestialBodies; 