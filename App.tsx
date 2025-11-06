
import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Satellite, GlobeStyle, GeminiModel } from './types';
import { GlobeHandle } from './components/Globe';
import SatelliteInfoPanel from './components/SatelliteInfoPanel';
import SatelliteList from './components/SatelliteList';
import SettingsPanel from './components/SettingsPanel';
import Hud from './components/Hud';
import { useOrbitalData } from './hooks/useOrbitalData';
import { useI18n } from './i18n';

// Lazy load the Globe component as it might be heavy
const Globe = React.lazy(() => import('./components/Globe'));

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


const App: React.FC = () => {
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite | null>(null);
  const [activeCategories, setActiveCategories] = useState<string[]>(['STATIONS']);
  const [searchTerm, setSearchTerm] = useState('');
  const [altitudeRange, setAltitudeRange] = useState<[number, number]>([0, 42000]);
  const [showAllOrbits, setShowAllOrbits] = useState(true);
  const [highVisibilityOrbits, setHighVisibilityOrbits] = useState(false);
  const [satelliteView, setSatelliteView] = useState(false);
  const [globeStyle, setGlobeStyle] = useState<GlobeStyle>(GlobeStyle.HOLOGRAPHIC);
  const [aiModel, setAiModel] = useState<GeminiModel>(GeminiModel.FLASH_LITE);
  const { t } = useI18n();
  const globeRef = useRef<GlobeHandle>(null);

  const { satellites: allSatellites, loading } = useOrbitalData(activeCategories);

  useEffect(() => {
    document.title = t('hud.title');
  }, [t]);

  // --- Mobile Panel Drag Logic ---
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startY: 0, lastY: 0, velocity: 0, moved: false });

  const snapPoints = useMemo(() => ({
      closed: window.innerHeight - 80, // 5rem handle
      open: window.innerHeight * 0.1, // 90vh panel height
  }), []);

  const [panelTop, setPanelTop] = useState(snapPoints.closed);
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'info' | 'ai' | 'settings'>('list');

  // Reset mobile tab to 'list' when panel is closed or satellite is deselected
  useEffect(() => {
      if (panelTop === snapPoints.closed) {
          setActiveMobileTab('list');
      }
      if (!selectedSatellite && (activeMobileTab === 'info' || activeMobileTab === 'ai')) {
          setActiveMobileTab('list');
      }
  }, [panelTop, snapPoints.closed, selectedSatellite, activeMobileTab]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
        setIsDragging(true);
        dragInfo.current = { startY: e.clientY, lastY: e.clientY, velocity: 0, moved: false };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const currentY = e.clientY;
    const delta = currentY - dragInfo.current.lastY;
    
    if (Math.abs(currentY - dragInfo.current.startY) > 5) {
        dragInfo.current.moved = true;
    }

    dragInfo.current.velocity = dragInfo.current.velocity * 0.8 + delta * 0.2;

    setPanelTop(prevTop => Math.max(snapPoints.open, Math.min(snapPoints.closed, prevTop + delta)));
    dragInfo.current.lastY = currentY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;

    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const projectedEnd = panelTop + dragInfo.current.velocity * 5;
    const halfway = (snapPoints.open + snapPoints.closed) / 2;
    const shouldOpen = projectedEnd < halfway;

    setPanelTop(shouldOpen ? snapPoints.open : snapPoints.closed);
  };
  
  const togglePanel = () => {
    setPanelTop(prev => prev === snapPoints.open ? snapPoints.closed : snapPoints.open);
  };
  
  // --- Mobile Swipe Logic ---
    const touchStart = useRef({ x: 0, y: 0 });
    const isSwiping = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        const disallowedTabs: typeof activeMobileTab[] = ['list', 'settings'];
        if ((e.target as HTMLElement).closest('[data-drag-handle]') || disallowedTabs.includes(activeMobileTab)) {
            return;
        }
        touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
        isSwiping.current = true;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!isSwiping.current) return;
        isSwiping.current = false;
        
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };

        const deltaX = touchEnd.x - touchStart.current.x;
        const deltaY = touchEnd.y - touchStart.current.y;
        const threshold = 50; 

        if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY)) {
            return;
        }

        const swipedLeft = deltaX < 0;
        const swipedRight = deltaX > 0;

        if (activeMobileTab === 'info' && swipedLeft) {
            setActiveMobileTab('ai');
        } else if (activeMobileTab === 'ai' && swipedRight) {
            setActiveMobileTab('info');
        }
    };


  const displayedSatellites = useMemo(() => {
    return allSatellites.filter(sat => {
      const searchMatch = sat.name.toLowerCase().includes(searchTerm.toLowerCase()) || sat.id.includes(searchTerm);
      const altitude = sat.location?.height;
      const altitudeMatch = typeof altitude === 'number' ? (altitude >= altitudeRange[0] && altitude <= altitudeRange[1]) : true; // Show if location not yet calculated
      return searchMatch && altitudeMatch;
    });
  }, [allSatellites, searchTerm, altitudeRange]);
  
  const handleSelectSatellite = (satellite: Satellite) => {
    setSelectedSatellite(satellite);
    setSatelliteView(false); // Exit satellite view when selecting a new satellite
    if (window.matchMedia('(max-width: 767px)').matches) {
        setActiveMobileTab('info');
        setPanelTop(snapPoints.open);
    }
  };
  
  // Auto-select first satellite from the filtered list
  useEffect(() => {
    if (!selectedSatellite || !displayedSatellites.find(s => s.id === selectedSatellite.id)) {
      setSelectedSatellite(displayedSatellites.length > 0 ? displayedSatellites[0] : null);
    }
  }, [displayedSatellites]);

  const handleCategoryChange = (category: string, isChecked: boolean) => {
    setActiveCategories(prev => {
        const newCategories = isChecked ? [...prev, category] : prev.filter(c => c !== category);
        if (newCategories.length === 0) {
            setSelectedSatellite(null);
        }
        return newCategories;
    });
  };

  const handleToggleSatelliteView = () => {
    if (selectedSatellite) {
        setSatelliteView(v => !v);
    }
  };
  
  const handleResetFilters = () => {
    setActiveCategories(['STATIONS']);
    setSearchTerm('');
    setAltitudeRange([0, 42000]);
    setShowAllOrbits(true);
    setHighVisibilityOrbits(false);
    setGlobeStyle(GlobeStyle.HOLOGRAPHIC);
    setAiModel(GeminiModel.FLASH_LITE);
  };

  const handleOpenSettings = () => {
      setActiveMobileTab('settings');
      setPanelTop(snapPoints.open);
  }


  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-gray-200">
        <Hud />
        <div className="absolute inset-0 flex items-stretch md:p-8 md:gap-8">
            {/* Desktop Left Panel */}
            <div className="hidden md:flex md:w-1/4 md:max-w-sm">
                 <SatelliteInfoPanel 
                    satellite={selectedSatellite} 
                    onToggleSatelliteView={handleToggleSatelliteView}
                    isSatelliteView={satelliteView}
                    aiModel={aiModel}
                />
            </div>

             {/* Center Column */}
            <div className="flex-1 flex flex-col h-full">
                <div 
                  className="flex-grow relative pointer-events-auto bg-black/30 md:border md:border-gray-700/50 h-full"
                  onClick={() => {
                      if (window.matchMedia('(max-width: 767px)').matches && panelTop === snapPoints.open) {
                          setPanelTop(snapPoints.closed);
                      }
                  }}
                >
                    <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">{t('globe.loadingAssets')}</div>}>
                        <Globe
                            ref={globeRef}
                            satellites={displayedSatellites}
                            onSelectSatellite={handleSelectSatellite}
                            selectedSatellite={selectedSatellite}
                            showAllOrbits={showAllOrbits}
                            highVisibilityOrbits={highVisibilityOrbits}
                            satelliteView={satelliteView}
                            globeStyle={globeStyle}
                        />
                    </Suspense>
                </div>
            </div>

            {/* Desktop Right Panel */}
            <div className="hidden md:flex md:w-1/4 md:max-w-sm flex-col gap-8">
                <div className="flex-1 min-h-0">
                    <SatelliteList 
                        satellites={displayedSatellites} 
                        onSelect={handleSelectSatellite} 
                        selectedSatellite={selectedSatellite} 
                        loading={loading}
                    />
                </div>
                <div className="bg-black/50 backdrop-blur-sm border border-gray-500/50 p-4 shadow-lg shadow-gray-500/10">
                    <div className="flex justify-between items-center border-b-2 border-gray-400/80 pb-2 mb-2">
                         <h2 className="text-xl text-gray-200 [text-shadow:0_0_8px_#ffffff]">{t('satelliteList.filters.header')}</h2>
                         <button 
                            onClick={handleResetFilters} 
                            className="text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 px-2 py-0.5 rounded border border-transparent hover:border-gray-600"
                        >
                            {t('satelliteList.filters.resetAll')}
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto pr-2">
                       <SettingsPanel 
                            activeCategories={activeCategories}
                            onCategoryChange={handleCategoryChange}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            altitudeRange={altitudeRange}
                            onAltitudeChange={setAltitudeRange}
                            showAllOrbits={showAllOrbits}
                            onShowAllOrbitsChange={setShowAllOrbits}
                            highVisibilityOrbits={highVisibilityOrbits}
                            onHighVisibilityOrbitsChange={setHighVisibilityOrbits}
                            globeStyle={globeStyle}
                            onGlobeStyleChange={setGlobeStyle}
                            aiModel={aiModel}
                            onAiModelChange={setAiModel}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* --- Mobile Floating Action Buttons --- */}
        <div className="md:hidden absolute bottom-24 right-4 z-10 flex flex-col gap-3">
             <button
                onClick={handleOpenSettings}
                aria-label={t('satelliteList.filters.header')}
                className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border-2 border-gray-500/50 text-gray-200 flex items-center justify-center shadow-lg hover:bg-white/10 hover:border-gray-400 transition-all"
            >
                <SettingsIcon />
            </button>
        </div>


        {/* --- Mobile UI Panel --- */}
        <div 
            className={`
                md:hidden pointer-events-auto
                absolute left-0 right-0 z-20
            `}
            style={{
                height: `calc(100vh - ${snapPoints.open}px)`,
                transform: `translateY(${panelTop}px)`,
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div 
                className="h-full flex flex-col bg-black/70 backdrop-blur-md border-t-2 border-gray-500/50 shadow-lg shadow-black rounded-t-lg"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Handle / Header */}
                <div className="flex-shrink-0 w-full flex flex-col">
                    <div 
                        className="w-full h-8 flex items-center justify-center cursor-grab pt-4"
                        data-drag-handle
                        onClick={() => { if (!dragInfo.current.moved) togglePanel(); }}
                    >
                         <div className="w-10 h-1 bg-gray-500 rounded-full pointer-events-none"></div>
                    </div>
                    <div className="h-14 flex items-center justify-between px-2 border-b border-gray-600/50">
                        {activeMobileTab === 'list' && (
                             <h2 className="text-center font-bold text-lg text-white w-full" aria-live="polite">
                                {t('mobile.header.list')}
                             </h2>
                        )}
                        {(activeMobileTab === 'info' || activeMobileTab === 'ai') && (
                            <>
                                <div className="flex-1 text-left">
                                    <button 
                                        onClick={() => setActiveMobileTab('list')}
                                        className="flex items-center gap-1 text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                                        aria-label={t('mobile.backToList')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>{t('mobile.backToList')}</span>
                                    </button>
                                </div>
                                <div className="flex-1 text-center">
                                    <div className="inline-flex border border-gray-600 rounded-md p-0.5 bg-black/30">
                                        <button
                                            onClick={() => setActiveMobileTab('info')}
                                            className={`px-4 py-1 text-sm rounded-sm transition-colors ${activeMobileTab === 'info' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                                            aria-pressed={activeMobileTab === 'info'}
                                        >
                                            {t('satelliteInfoPanel.mobile.header.info')}
                                        </button>
                                        <button
                                            onClick={() => setActiveMobileTab('ai')}
                                            className={`px-4 py-1 text-sm rounded-sm transition-colors ${activeMobileTab === 'ai' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                                            aria-pressed={activeMobileTab === 'ai'}
                                        >
                                            {t('satelliteInfoPanel.mobile.header.ai')}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 text-right"></div>
                            </>
                        )}
                        {activeMobileTab === 'settings' && (
                             <div className="w-full flex justify-between items-center">
                                 <button 
                                    onClick={() => setActiveMobileTab('list')}
                                    className="flex items-center gap-1 text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                                    aria-label={t('mobile.backToList')}
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                       <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                     </svg>
                                     <span>{t('mobile.backToList')}</span>
                                 </button>
                                <h2 className="text-lg font-bold text-white">{t('satelliteList.filters.header')}</h2>
                                <button 
                                    onClick={handleResetFilters} 
                                    className="text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 px-3 py-1 rounded border border-gray-600/50"
                                >
                                    {t('satelliteList.filters.reset')}
                                </button>
                             </div>
                        )}
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-grow min-h-0 overflow-y-auto">
                   <div className={`${activeMobileTab === 'list' ? 'block' : 'hidden'} h-full`}>
                        <SatelliteList 
                            satellites={displayedSatellites} 
                            onSelect={handleSelectSatellite} 
                            selectedSatellite={selectedSatellite} 
                            loading={loading}
                            isEmbedded={true}
                        />
                   </div>
                   <div className={`${activeMobileTab === 'settings' ? 'block' : 'hidden'} h-full`}>
                        <div className="p-4 pt-2 h-full overflow-y-auto">
                            <SettingsPanel 
                                activeCategories={activeCategories}
                                onCategoryChange={handleCategoryChange}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                altitudeRange={altitudeRange}
                                onAltitudeChange={setAltitudeRange}
                                showAllOrbits={showAllOrbits}
                                onShowAllOrbitsChange={setShowAllOrbits}
                                highVisibilityOrbits={highVisibilityOrbits}
                                onHighVisibilityOrbitsChange={setHighVisibilityOrbits}
                                globeStyle={globeStyle}
                                onGlobeStyleChange={setGlobeStyle}
                                aiModel={aiModel}
                                onAiModelChange={setAiModel}
                                isEmbedded={true}
                            />
                        </div>
                   </div>
                    <div className={`${(activeMobileTab === 'info' || activeMobileTab === 'ai') ? 'block' : 'hidden'} h-full`}>
                       <SatelliteInfoPanel 
                            satellite={selectedSatellite} 
                            onToggleSatelliteView={handleToggleSatelliteView}
                            isSatelliteView={satelliteView}
                            isEmbedded={true}
                            viewMode={activeMobileTab === 'info' ? 'details' : 'ai'}
                            aiModel={aiModel}
                        />
                    </div>
                </div>
            </div>
        </div>
    </main>
  );
};

export default App;