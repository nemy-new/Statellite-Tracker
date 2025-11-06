import React, { useRef, useMemo, useState, useEffect, Suspense, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
// Fix: Removed Sprite and added Billboard and Plane as Sprite is not available in this version of drei.
import { OrbitControls, Line, useTexture, Billboard, Plane } from '@react-three/drei';
import * as THREE from 'three';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';
import * as satellite from 'satellite.js';

import { Satellite, GlobeStyle } from '../types';
import { EARTH_RADIUS } from '../constants';

interface GlobeProps {
  satellites: Satellite[];
  onSelectSatellite: (satellite: Satellite) => void;
  selectedSatellite: Satellite | null;
  showAllOrbits: boolean;
  highVisibilityOrbits: boolean;
  satelliteView: boolean;
  globeStyle: GlobeStyle;
}

export interface GlobeHandle {
    resetCamera: () => void;
}

const EARTH_RENDER_RADIUS = 2.5;
const SCENE_SCALE_FACTOR = EARTH_RADIUS / EARTH_RENDER_RADIUS;

const svgToDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

const SATELLITE_ICON = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 0L24 12L12 24L0 12L12 0z"/></svg>`);

const getIcon = (_category: string) => {
    return SATELLITE_ICON;
};


// Helper to convert Lat/Lon to 3D Cartesian coordinates
const convertCoords = (lon: number, lat: number, radius = EARTH_RENDER_RADIUS) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
};

// Helper to convert ECI coordinates from satellite.js to Three.js scene coordinates
const eciToSceneCoords = (eciPos: {x: number, y: number, z: number}) => {
    // satellite.js ECI frame: x to vernal equinox, z to north pole.
    // three.js frame: y-axis is up (north pole).
    return new THREE.Vector3(
        eciPos.x / SCENE_SCALE_FACTOR,
        eciPos.z / SCENE_SCALE_FACTOR,
        -eciPos.y / SCENE_SCALE_FACTOR
    );
};

const CameraManager: React.FC<{
    selectedSatellite: Satellite | null;
    satelliteView: boolean;
    controlsRef: React.RefObject<any>; // OrbitControls type is complex, using any
}> = ({ selectedSatellite, satelliteView, controlsRef }) => {
    useFrame(() => {
        if (!controlsRef.current) return;

        if (satelliteView && selectedSatellite?.positionEci) {
            const satPos = eciToSceneCoords(selectedSatellite.positionEci);
            // Make the satellite the center of rotation and disable zoom/pan
            controlsRef.current.target.lerp(satPos, 0.1);
            controlsRef.current.enableZoom = false;
            controlsRef.current.enablePan = false;
        } else {
             // Return to Earth-centered view and re-enable controls
            if (controlsRef.current.target.length() > 0.01) {
                controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);
            }
            controlsRef.current.enableZoom = true;
            controlsRef.current.enablePan = true;
        }
    });

    return null;
};


// Component for the atmospheric glow effect
const Atmosphere = React.memo(() => (
    <mesh scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[EARTH_RENDER_RADIUS, 64, 64]} />
        <shaderMaterial
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            transparent
            vertexShader={`
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `}
            fragmentShader={`
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.4 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(0.8, 0.8, 0.8, 1.0) * intensity;
                }
            `}
        />
    </mesh>
));

// Component for latitude/longitude lines
const Graticules = React.memo(({ color = "#999999" }: { color?: string }) => {
    const graticuleLines = useMemo(() => {
        const graticule = d3.geoGraticule().step([15, 15])();
        const paths = (graticule as any).coordinates.map((coords: [number, number][]) => {
            return coords.map(([lon, lat]) => convertCoords(lon, lat, EARTH_RENDER_RADIUS));
        });
        return paths;
    }, []);

    return (
        <group>
            {graticuleLines.map((points, i) => (
                <Line key={i} points={points} color={color} lineWidth={0.5} transparent opacity={0.3} />
            ))}
        </group>
    );
});

// Component to draw a single country's outline
const CountryLine: React.FC<{feature: any, color?: string, lineWidth?: number}> = React.memo(({ feature, color = "#bbbbbb", lineWidth = 1.0 }) => {
    const lines = useMemo(() => {
        const { type, coordinates } = feature.geometry;
        let paths: THREE.Vector3[][] = [];

        if (type === 'Polygon') {
            paths = coordinates.map((ring: [number, number][]) => 
                ring.map(([lon, lat]) => convertCoords(lon, lat, EARTH_RENDER_RADIUS * 1.001))
            );
        } else if (type === 'MultiPolygon') {
            paths = coordinates.flatMap((polygon: [number, number][][]) => 
                polygon.map((ring: [number, number][]) => 
                    ring.map(([lon, lat]) => convertCoords(lon, lat, EARTH_RENDER_RADIUS * 1.001))
                )
            );
        }
        
        return paths.map((points, i) => <Line key={i} points={points} color={color} lineWidth={lineWidth} transparent opacity={0.7} />);
    }, [feature, color, lineWidth]);

    return <>{lines}</>;
});

// Component to fetch and display all country outlines
const Countries = React.memo(({ color, lineWidth }: { color?: string, lineWidth?: number }) => {
    const [countries, setCountries] = useState<any[]>([]);

    useEffect(() => {
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
            .then(res => res.json())
            .then(data => {
                const features = (topojson.feature(data, data.objects.countries) as any).features;
                setCountries(features);
            });
    }, []);

    return <group>{countries.map((feature, i) => <CountryLine key={i} feature={feature} color={color} lineWidth={lineWidth} />)}</group>;
});

// The main earth component that renders based on the selected style
const EarthRenderer = ({ globeStyle }: { globeStyle: GlobeStyle }) => {
    switch(globeStyle) {
        case GlobeStyle.GRID:
            return <Graticules color="#999999" />;
        
        case GlobeStyle.SOLID:
            return (
                <group>
                    <mesh>
                        <sphereGeometry args={[EARTH_RENDER_RADIUS, 64, 64]} />
                        <meshStandardMaterial color="#222222" roughness={0.7} metalness={0.1} />
                    </mesh>
                    <Suspense fallback={null}><Countries color="#FFFFFF" /></Suspense>
                </group>
            );

        case GlobeStyle.WIREFRAME:
             return (
                <mesh>
                    <sphereGeometry args={[EARTH_RENDER_RADIUS, 32, 32]} />
                    <meshBasicMaterial color="#999999" wireframe transparent opacity={0.3} />
                </mesh>
            );
        
        case GlobeStyle.BLUEPRINT:
             return (
                <group>
                    <mesh>
                        <sphereGeometry args={[EARTH_RENDER_RADIUS, 64, 64]} />
                        <meshBasicMaterial color="#030712" transparent opacity={0.1} />
                    </mesh>
                    <Suspense fallback={null}>
                      <Graticules color="#FFFFFF" />
                      <Countries color="#FFFFFF" />
                    </Suspense>
                </group>
            );
        case GlobeStyle.OUTLINE:
            return (
                <group>
                    <mesh>
                        <sphereGeometry args={[EARTH_RENDER_RADIUS, 64, 64]} />
                        <meshBasicMaterial color="#111111" />
                    </mesh>
                    <Suspense fallback={null}><Countries color="#FFFFFF" lineWidth={1} /></Suspense>
                </group>
            );
        
        case GlobeStyle.ATMOSPHERE:
            return (
                <group>
                    <mesh>
                        <sphereGeometry args={[EARTH_RENDER_RADIUS, 64, 64]} />
                        <meshBasicMaterial color="#000000" />
                    </mesh>
                    <Atmosphere />
                </group>
            );
        
        case GlobeStyle.HOLOGRAPHIC:
        default:
            return (
                <group>
                    <mesh>
                        <sphereGeometry args={[EARTH_RENDER_RADIUS, 64, 64]} />
                        <meshBasicMaterial color="#030712" transparent opacity={0.6} />
                    </mesh>
                    <Atmosphere />
                    <Suspense fallback={null}>
                        <Graticules color="#999999" />
                        <Countries color="#bbbbbb" />
                    </Suspense>
                </group>
            );
    }
};

const SatelliteMesh: React.FC<{ satellite: Satellite; onSelect: () => void; isSelected: boolean }> = ({ satellite, onSelect, isSelected }) => {
    const groupRef = useRef<THREE.Group>(null!);
    const planeRef = useRef<THREE.Mesh>(null!);
    const { camera } = useThree();
    
    const iconUrl = useMemo(() => getIcon(satellite.category), [satellite.category]);
    const texture = useTexture(iconUrl);
    
    useFrame(() => {
      if (groupRef.current && satellite.positionEci && planeRef.current) {
        // Update satellite position
        const scenePos = eciToSceneCoords(satellite.positionEci);
        groupRef.current.position.copy(scenePos);
        
        // Scale icon based on distance to camera to maintain a consistent screen size
        const distance = groupRef.current.position.distanceTo(camera.position);
        // This factor is a magic number, adjusted for a visually pleasing size.
        const scaleFactor = distance * 0.015;
        const finalScale = isSelected ? scaleFactor * 1.4 : scaleFactor;
        planeRef.current.scale.set(finalScale, finalScale, 1);
      }
    });
  
    return (
      <group ref={groupRef}>
        <Billboard>
            <Plane
                ref={planeRef}
                args={[1, 1]} // Base size is 1x1, scaling is handled in useFrame
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                onPointerOver={(e) => (e.stopPropagation(), document.body.style.cursor = 'pointer')}
                onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <meshBasicMaterial
                    map={texture}
                    color={isSelected ? '#FFFFFF' : '#AAAAAA'}
                    toneMapped={false}
                    depthTest={false}
                    transparent
                    opacity={0.9}
                />
            </Plane>
        </Billboard>
      </group>
    );
};
  

const SatelliteOrbit: React.FC<{ satellite: Satellite; isSelected: boolean; highVisibility: boolean; }> = ({ satellite: satelliteData, isSelected, highVisibility }) => {
    const points = useMemo(() => {
        const { satrec } = satelliteData;
        if (!satrec) return [];
        
        const periodMinutes = (2 * Math.PI) / satrec.no; // Mean motion is in radians/minute
        const points = [];
        const now = new Date();

        for (let i = 0; i <= 128; i++) {
            const time = new Date(now.getTime() + (i / 128) * periodMinutes * 60000);
            const posVel = satellite.propagate(satrec, time);
            if (typeof posVel.position !== 'boolean') {
                points.push(eciToSceneCoords(posVel.position));
            }
        }
        return points;
    }, [satelliteData.satrec]);

    const color = isSelected ? '#FFFFFF' : (highVisibility ? '#999999' : '#666666');
    const opacity = isSelected ? 0.9 : (highVisibility ? 0.7 : 0.4);
    const lineWidth = isSelected ? 2.0 : (highVisibility ? 1.5 : 1.0);
  
    return <Line points={points} color={color} transparent opacity={opacity} lineWidth={lineWidth} />;
  };

const GlobeComponent: React.ForwardRefRenderFunction<GlobeHandle, GlobeProps> = ({ satellites, onSelectSatellite, selectedSatellite, showAllOrbits, highVisibilityOrbits, satelliteView, globeStyle }, ref) => {
  const controlsRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
      resetCamera: () => {
          if (controlsRef.current) {
              controlsRef.current.reset();
          }
      }
  }));
  
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      
      <EarthRenderer globeStyle={globeStyle} />
      
      <group>
        {satellites.map((sat) => (
            <SatelliteMesh 
                key={sat.id}
                satellite={sat} 
                onSelect={() => onSelectSatellite(sat)}
                isSelected={selectedSatellite?.id === sat.id}
            />
        ))}
        {satellites.map((sat) => {
            const isSelected = selectedSatellite?.id === sat.id;
            if (showAllOrbits || isSelected) {
                return <SatelliteOrbit key={`orbit-${sat.id}`} satellite={sat} isSelected={isSelected} highVisibility={highVisibilityOrbits} />;
            }
            return null;
        })}
      </group>

      <OrbitControls ref={controlsRef} enablePan={true} enableZoom={true} enableRotate={true} minDistance={4} maxDistance={1000}/>
      <CameraManager selectedSatellite={selectedSatellite} satelliteView={satelliteView} controlsRef={controlsRef} />
    </Canvas>
  );
};

export default forwardRef(GlobeComponent);