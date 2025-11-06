import { useState, useEffect, useRef } from 'react';
import * as satellite from 'satellite.js';
import { Satellite, GeodeticLocation, SatelliteStatus } from '../types';
import { TLE_CATEGORIES } from '../constants';

const parseTleSet = (tleText: string, categoryKey: string): Satellite[] => {
    const satellites: Satellite[] = [];
    const lines = tleText.trim().split('\n');

    for (let i = 0; i < lines.length; i += 3) {
        if (i + 2 >= lines.length) continue; 
        
        const name = lines[i].trim();
        const tleLine1 = lines[i + 1].trim();
        const tleLine2 = lines[i + 2].trim();

        if (!name || !tleLine1 || !tleLine2) continue;
        
        try {
            const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
            satellites.push({
                id: satrec.satnum,
                name: name,
                category: categoryKey,
                satrec: satrec,
                status: SatelliteStatus.OPERATIONAL,
            });
        } catch (e) {
            console.error("Failed to parse TLE for", name, e);
        }
    }
    return satellites;
};

export const useOrbitalData = (activeCategories: string[]) => {
    const [satellites, setSatellites] = useState<Satellite[]>([]);
    const [loading, setLoading] = useState(true);
    const satRef = useRef<Satellite[]>([]);

    useEffect(() => {
        const fetchAllTles = async () => {
             if (activeCategories.length === 0) {
                satRef.current = [];
                setSatellites([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            const allFetchedSatellites: Satellite[] = [];

            await Promise.all(
                activeCategories.map(async (catKey) => {
                    const source = TLE_CATEGORIES[catKey];
                    if (!source) return;
                    try {
                        const res = await fetch(source.url);
                        if (!res.ok) throw new Error(`Failed to fetch TLE from ${source.url}`);
                        const tleText = await res.text();
                        const parsedSats = parseTleSet(tleText, catKey);
                        allFetchedSatellites.push(...parsedSats);
                    } catch (error) {
                        console.error(`Error fetching category ${catKey}:`, error);
                    }
                })
            );
            
            const uniqueSatellites = Array.from(new Map(allFetchedSatellites.map(sat => [sat.id, sat])).values());

            satRef.current = uniqueSatellites;
            // Initial position calculation
            const now = new Date();
            const initialSats = uniqueSatellites.map(sat => {
                 try {
                    const positionAndVelocity = satellite.propagate(sat.satrec, now);
                    if (typeof positionAndVelocity.position === 'boolean' || typeof positionAndVelocity.velocity === 'boolean') {
                       return { ...sat, location: undefined, velocity: undefined, positionEci: undefined, status: SatelliteStatus.DEORBIT };
                   }
                   const gmst = satellite.gstime(now);
                   const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
                   const location: GeodeticLocation = {
                       longitude: satellite.degreesLong(geodetic.longitude),
                       latitude: satellite.degreesLat(geodetic.latitude),
                       height: geodetic.height,
                   };
                   return { ...sat, location, velocity: positionAndVelocity.velocity as any, positionEci: positionAndVelocity.position as any };
                 } catch (e) {
                    console.error(`Error propagating satellite ${sat.id} (${sat.name}):`, e);
                    return { ...sat, location: undefined, velocity: undefined, positionEci: undefined, status: SatelliteStatus.DEGRADED };
                 }
            });
            setSatellites(initialSats);
            setLoading(false);
        };
        fetchAllTles();
    }, [activeCategories]);

    useEffect(() => {
        if (satRef.current.length === 0) return;

        const updatePositions = () => {
            const now = new Date();
            const updatedSats = satRef.current.map(sat => {
                try {
                    const positionAndVelocity = satellite.propagate(sat.satrec, now);
                    if (typeof positionAndVelocity.position === 'boolean' || typeof positionAndVelocity.velocity === 'boolean') {
                        // Only update if not already marked for deorbit
                        if (sat.status !== SatelliteStatus.DEORBIT) {
                            return { ...sat, location: undefined, velocity: undefined, positionEci: undefined, status: SatelliteStatus.DEORBIT };
                        }
                        return sat;
                    }
                    
                    const gmst = satellite.gstime(now);
                    const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
                    
                    const location: GeodeticLocation = {
                        longitude: satellite.degreesLong(geodetic.longitude),
                        latitude: satellite.degreesLat(geodetic.latitude),
                        height: geodetic.height,
                    };
    
                    return { ...sat, location, velocity: positionAndVelocity.velocity as any, positionEci: positionAndVelocity.position as any, status: SatelliteStatus.OPERATIONAL };
                } catch(e) {
                     // Only update if not already marked as degraded or deorbit
                    if (sat.status !== SatelliteStatus.DEGRADED && sat.status !== SatelliteStatus.DEORBIT) {
                        console.error(`Error updating satellite ${sat.id} (${sat.name}):`, e);
                        return { ...sat, location: undefined, velocity: undefined, positionEci: undefined, status: SatelliteStatus.DEGRADED };
                    }
                    return sat;
                }
            });
            
            // This is a more performant way to update state
            setSatellites(prevSats => {
                const satMap = new Map(updatedSats.map(s => [s.id, s]));
                return prevSats.map(ps => satMap.get(ps.id) || ps);
            });
        };

        const intervalId = setInterval(updatePositions, 1000);
        updatePositions(); // Initial call

        return () => clearInterval(intervalId);
    }, [satRef.current]);

    return { satellites, loading };
};