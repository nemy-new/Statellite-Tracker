import React from 'react';
import { GlobeStyle, GeminiModel } from '../types';
import { TLE_CATEGORIES } from '../constants';
import ToggleSwitch from './ToggleSwitch';
import { useI18n } from '../i18n';

interface SettingsPanelProps {
  activeCategories: string[];
  onCategoryChange: (category: string, checked: boolean) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  altitudeRange: [number, number];
  onAltitudeChange: (range: [number, number]) => void;
  showAllOrbits: boolean;
  onShowAllOrbitsChange: (checked: boolean) => void;
  highVisibilityOrbits: boolean;
  onHighVisibilityOrbitsChange: (checked: boolean) => void;
  globeStyle: GlobeStyle;
  onGlobeStyleChange: (style: GlobeStyle) => void;
  aiModel: GeminiModel;
  onAiModelChange: (model: GeminiModel) => void;
  isEmbedded?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    activeCategories, onCategoryChange, searchTerm, onSearchChange,
    altitudeRange, onAltitudeChange, showAllOrbits, onShowAllOrbitsChange,
    highVisibilityOrbits, onHighVisibilityOrbitsChange,
    globeStyle, onGlobeStyleChange,
    aiModel, onAiModelChange,
    isEmbedded = false
}) => {
  const { t, language, setLanguage } = useI18n();
    
  return (
      <div className={`flex-shrink-0 text-gray-400 ${isEmbedded ? 'space-y-6 pt-2 pb-2' : 'mb-3 space-y-4 text-sm pr-2'}`}>
            <input 
                type="text"
                placeholder={t('satelliteList.filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`w-full bg-black/50 border border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-500 ${isEmbedded ? 'p-3 text-base' : 'p-1.5'}`}
            />
            <div>
                <p className={`mb-2 ${isEmbedded ? 'text-lg' : 'text-gray-300'}`}>{t('satelliteList.filters.category')}</p>
                <div className="flex flex-col space-y-3">
                  {Object.keys(TLE_CATEGORIES).map((key) => (
                    <div key={key} className="flex items-center justify-between bg-black/30 p-3 border border-gray-700/50 rounded-md">
                      <label htmlFor={`cat-toggle-${key}`} className="text-base text-gray-200 cursor-pointer">{t(`categories.${key}`)}</label>
                      <ToggleSwitch id={`cat-toggle-${key}`} checked={activeCategories.includes(key)} onChange={checked => onCategoryChange(key, checked)} />
                    </div>
                  ))}
                </div>
            </div>
            <div>
                <label className={`block mb-2 ${isEmbedded ? 'text-lg' : 'text-gray-300'}`}>{t('satelliteList.filters.altitude')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="min-alt" className="text-gray-400 text-sm mb-1 block">{t('satelliteList.filters.min')}</label>
                      <input id="min-alt" type="number" value={altitudeRange[0]} onChange={e => onAltitudeChange([+e.target.value, altitudeRange[1]])} className="w-full bg-black/50 border border-gray-600/50 p-3 text-base focus:outline-none focus:ring-1 focus:ring-gray-400" placeholder={t('satelliteList.filters.min')} />
                    </div>
                    <div>
                      <label htmlFor="max-alt" className="text-gray-400 text-sm mb-1 block">{t('satelliteList.filters.max')}</label>
                      <input id="max-alt" type="number" value={altitudeRange[1]} onChange={e => onAltitudeChange([altitudeRange[0], +e.target.value])} className="w-full bg-black/50 border border-gray-600/50 p-3 text-base focus:outline-none focus:ring-1 focus:ring-gray-400" placeholder={t('satelliteList.filters.max')} />
                    </div>
                  </div>
            </div>
            <div>
                <label className={`block mb-2 ${isEmbedded ? 'text-lg' : 'text-gray-300'}`}>{t('satelliteList.filters.language')}</label>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`w-full bg-black/50 border border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-gray-400 ${isEmbedded ? 'p-3 text-base' : 'p-1.5'}`}
                >
                    <option value="en" className="bg-black text-gray-200">English</option>
                    <option value="ja" className="bg-black text-gray-200">日本語</option>
                </select>
            </div>
            <div>
                <label className={`block mb-2 ${isEmbedded ? 'text-lg' : 'text-gray-300'}`}>{t('satelliteList.filters.globeStyle')}</label>
                <select
                    value={globeStyle}
                    onChange={(e) => onGlobeStyleChange(e.target.value as GlobeStyle)}
                    className={`w-full bg-black/50 border border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-gray-400 ${isEmbedded ? 'p-3 text-base' : 'p-1.5'}`}
                >
                    {Object.values(GlobeStyle).map(style => (
                        <option key={style} value={style} className="bg-black text-gray-200">{t(`globeStyles.${style}`)}</option>
                    ))}
                </select>
            </div>
             <div>
                <label className={`block mb-2 ${isEmbedded ? 'text-lg' : 'text-gray-300'}`}>{t('satelliteList.filters.aiModel')}</label>
                <select
                    value={aiModel}
                    onChange={(e) => onAiModelChange(e.target.value as GeminiModel)}
                    className={`w-full bg-black/50 border border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-gray-400 ${isEmbedded ? 'p-3 text-base' : 'p-1.5'}`}
                >
                    <option value={GeminiModel.PRO} className="bg-black text-gray-200">Gemini 2.5 Pro</option>
                    <option value={GeminiModel.FLASH} className="bg-black text-gray-200">Gemini 2.5 Flash</option>
                    <option value={GeminiModel.FLASH_LITE} className="bg-black text-gray-200">Gemini 2.5 Flash Lite</option>
                </select>
            </div>
            <div className='space-y-3'>
                <div className="flex items-center justify-between bg-black/30 p-3 border border-gray-700/50 rounded-md">
                  <label htmlFor="show-all-orbits-toggle" className="text-base text-gray-200 cursor-pointer">{t('satelliteList.filters.showAllOrbits')}</label>
                  <ToggleSwitch id="show-all-orbits-toggle" checked={showAllOrbits} onChange={onShowAllOrbitsChange} />
                </div>
                {showAllOrbits && (
                    <div className="flex items-center justify-between bg-black/30 p-3 border border-gray-700/50 rounded-md ml-4 animate-fade-in">
                      <label htmlFor="high-vis-orbits-toggle" className="text-base text-gray-200 cursor-pointer">{t('satelliteList.filters.highVisOrbits')}</label>
                      <ToggleSwitch id="high-vis-orbits-toggle" checked={highVisibilityOrbits} onChange={onHighVisibilityOrbitsChange} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPanel;