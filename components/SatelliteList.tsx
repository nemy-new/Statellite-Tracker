

import React from 'react';
import { Satellite, SatelliteStatus } from '../types';
import { useI18n } from '../i18n';
import SettingsPanel from './SettingsPanel';

interface SatelliteListProps {
  satellites: Satellite[];
  onSelect: (satellite: Satellite) => void;
  selectedSatellite: Satellite | null;
  loading: boolean;
  isEmbedded?: boolean;
}


const SatelliteList: React.FC<SatelliteListProps> = ({ 
    satellites, onSelect, selectedSatellite, loading,
    isEmbedded = false
}) => {
  const { t } = useI18n();

  const statusIndicatorClass = {
    [SatelliteStatus.OPERATIONAL]: "bg-white shadow-[0_0_6px_#ffffff]",
    [SatelliteStatus.STEALTH]: "bg-gray-400 shadow-[0_0_6px_#9ca3af]",
    [SatelliteStatus.DEGRADED]: "bg-gray-600",
    [SatelliteStatus.INACTIVE]: "bg-gray-800",
    [SatelliteStatus.DEORBIT]: "bg-black border-2 border-white"
  };
  
  if (isEmbedded) {
    return (
        <div className="p-4 pt-0 h-full flex flex-col">
            {loading ? (
             <div className="flex-grow flex flex-col justify-center items-center text-gray-300">
                <p className="animate-pulse text-2xl">{t('satelliteList.fetching')}</p>
             </div>
            ) : (
            <div className="overflow-y-auto pr-2 flex-grow pt-2">
              {satellites.length > 0 ? satellites.map((satellite) => (
                <div
                  key={satellite.id}
                  onClick={() => onSelect(satellite)}
                  className={`flex items-center justify-between mb-1 cursor-pointer transition-colors duration-200 border-l-2 p-3 ${selectedSatellite?.id === satellite.id ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}
                >
                  <div className="flex items-center overflow-hidden">
                    <span className={`w-3.5 h-3.5 rounded-full mr-4 flex-shrink-0 ${statusIndicatorClass[satellite.status]} ${satellite.status !== SatelliteStatus.INACTIVE && satellite.status !== SatelliteStatus.DEGRADED ? 'animate-pulse-fast' : ''}`}></span>
                    <div className="truncate">
                      <p className="font-bold leading-tight truncate text-gray-100 text-lg">{satellite.name}</p>
                      <p className="leading-tight text-base text-gray-300">{t(`categories.${satellite.category}`)}</p>
                    </div>
                  </div>
                  <span className={`ml-2 font-mono text-sm ${selectedSatellite?.id === satellite.id ? 'text-gray-100' : 'text-gray-300'}`}>{t(`satelliteStatus.${satellite.status}`)}</span>
                </div>
              )) : (
                 <div className="flex-grow flex flex-col justify-center items-center text-gray-400 h-full">
                    <p className="text-xl">{t('satelliteList.noResults')}</p>
                    <p className="text-center text-base">{t('satelliteList.noResultsHint')}</p>
                 </div>
              )}
            </div>
            )}
        </div>
    );
  }


  return (
    <div 
        className="h-full flex flex-col bg-black/50 backdrop-blur-sm border border-gray-500/50 p-4 shadow-lg shadow-gray-500/10"
        style={{ clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 0 100%)' }}
    >
      <div className="border-b-2 border-gray-400/80 pb-2 mb-2 flex-shrink-0 flex justify-between items-center">
        <h2 className="text-xl text-gray-200 [text-shadow:0_0_8px_#ffffff]">{t('satelliteList.title')}</h2>
      </div>

      <div className="flex-shrink-0 text-gray-400 mb-3 space-y-4 text-sm pr-2">
        {/* Filter controls are now in SettingsPanel for mobile, but could be here for desktop */}
        <p className="text-center text-gray-500">{t('satelliteList.desktopFilterHint') || 'Filters are available in the settings panel on mobile.'}</p>
      </div>


      {loading ? (
         <div className="flex-grow flex flex-col justify-center items-center text-gray-300">
            <p className="animate-pulse text-xl">{t('satelliteList.fetching')}</p>
         </div>
      ) : (
        <div className="overflow-y-auto pr-2 flex-grow border-t border-gray-600/50 pt-2">
          {satellites.length > 0 ? satellites.map((satellite) => (
            <div
              key={satellite.id}
              onClick={() => onSelect(satellite)}
              className={`flex items-center justify-between mb-1 cursor-pointer transition-colors duration-200 border-l-2 p-2 ${selectedSatellite?.id === satellite.id ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}
            >
              <div className="flex items-center overflow-hidden">
                <span className={`w-3.5 h-3.5 rounded-full mr-4 flex-shrink-0 ${statusIndicatorClass[satellite.status]} ${satellite.status !== SatelliteStatus.INACTIVE && satellite.status !== SatelliteStatus.DEGRADED ? 'animate-pulse-fast' : ''}`}></span>
                <div className="truncate">
                  <p className="font-bold leading-tight truncate text-gray-100 text-base">{satellite.name}</p>
                  <p className="leading-tight text-xs text-gray-400">{t(`categories.${satellite.category}`)}</p>
                </div>
              </div>
              <span className={`ml-2 font-mono text-xs ${selectedSatellite?.id === satellite.id ? 'text-gray-100' : 'text-gray-300'}`}>{t(`satelliteStatus.${satellite.status}`)}</span>
            </div>
          )) : (
             <div className="flex-grow flex flex-col justify-center items-center text-gray-400 h-full">
                <p className="text-lg">{t('satelliteList.noResults')}</p>
                <p className="text-center text-sm">{t('satelliteList.noResultsHint')}</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SatelliteList;