import { SatRec } from 'satellite.js';

export enum GeminiModel {
  PRO = 'gemini-2.5-pro',
  FLASH = 'gemini-2.5-flash',
  FLASH_LITE = 'gemini-flash-lite-latest',
}

export enum SatelliteStatus {
    OPERATIONAL = "OPERATIONAL",
    DEGRADED = "DEGRADED",
    INACTIVE = "INACTIVE",
    STEALTH = "STEALTH",
    DEORBIT = "DE-ORBIT BURN"
}

export interface GeodeticLocation {
    latitude: number; // degrees
    longitude: number; // degrees
    height: number; // km
}

export interface Satellite {
  id: string;
  name: string;
  category: string;
  status: SatelliteStatus;
  satrec: SatRec;
  positionEci?: { x: number; y: number; z: number }; // ECI, km
  location?: GeodeticLocation;
  velocity?: { x: number; y: number; z: number }; // ECI, km/s
}

export enum GlobeStyle {
  HOLOGRAPHIC = 'Holographic',
  GRID = 'Grid',
  SOLID = 'Solid',
  ATMOSPHERE = 'Atmosphere',
  BLUEPRINT = 'Blueprint',
  WIREFRAME = 'Wireframe',
  OUTLINE = 'Outline',
}