import React, { useState, useEffect, useRef } from 'react';
import { Satellite, GeminiModel } from '../types';
import { GoogleGenAI } from '@google/genai';
import { useI18n } from '../i18n';

interface SatelliteInfoPanelProps {
  satellite: Satellite | null;
  onToggleSatelliteView: () => void;
  isSatelliteView: boolean;
  aiModel: GeminiModel;
  isEmbedded?: boolean;
  viewMode?: 'details' | 'ai';
}

interface Message {
    sender: 'user' | 'gemini';
    text: string;
    sources?: { web: { uri: string; title: string } }[];
}

const julianToDateString = (julian: number): string => {
    if (!julian) return 'N/A';
    // The number of days between the Julian epoch and the Unix epoch.
    const UNIX_EPOCH_JULIAN = 2440587.5;
    const millisPerDay = 86400 * 1000;
    const dateMillis = (julian - UNIX_EPOCH_JULIAN) * millisPerDay;
    if (isNaN(dateMillis)) return 'N/A';
    return new Date(dateMillis).toISOString().replace('T', ' ').substring(0, 19);
};

const InfoRow: React.FC<{ label: string; value: string | number; unit?: string; className?: string; isEmbedded?: boolean; }> = ({ label, value, unit, className = '', isEmbedded = false }) => (
    <div className={`flex justify-between items-baseline border-b border-gray-700 py-2 ${className}`}>
        <span className={`text-gray-400 ${isEmbedded ? 'text-base' : 'text-sm'}`}>{label}:</span>
        <span className="text-right">
            <span className={`${isEmbedded ? 'text-lg' : 'text-base'} text-gray-200`}>{value}</span>
            {unit && <span className={`ml-1 ${isEmbedded ? 'text-sm' : 'text-xs'} text-gray-200/70`}>{unit}</span>}
        </span>
    </div>
);

const MetricCard: React.FC<{ label: string; value: string | number; unit?: string; }> = ({ label, value, unit }) => (
    <div className="bg-black/40 p-3 rounded-md border border-gray-700/50 flex flex-col items-center justify-center text-center h-full">
        <span className="text-2xl font-bold text-gray-100 [text-shadow:0_0_4px_#ffffff]">{value}</span>
        <span className="text-sm text-gray-400 mt-1">{label}</span>
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
    </div>
);


const SatelliteInfoPanel: React.FC<SatelliteInfoPanelProps> = ({ satellite, onToggleSatelliteView, isSatelliteView, aiModel, isEmbedded = false, viewMode }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDetailsMinimized, setIsDetailsMinimized] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [animationKey, setAnimationKey] = useState(0);
    const { t } = useI18n();

    useEffect(() => {
        setMessages([]);
        setChatInput('');
    }, [satellite]);

    useEffect(() => {
        setAnimationKey(prev => prev + 1);
    }, [viewMode, satellite]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isGenerating]);

    const getSatelliteContext = () => {
        if (!satellite) return '';
        const velocity = satellite.velocity 
            ? Math.sqrt(satellite.velocity.x**2 + satellite.velocity.y**2 + satellite.velocity.z**2).toFixed(3) 
            : 'N/A';
        const inclination = satellite.satrec ? (satellite.satrec.inclo * (180 / Math.PI)).toFixed(4) : 'N/A';
        const epoch = satellite.satrec ? julianToDateString(satellite.satrec.jdsatepoch) : 'N/A';

        // Use English for the model context for consistency
        return `
- Name: ${satellite.name}
- NORAD ID: ${satellite.id}
- Category: ${satellite.category}
- Altitude: ${satellite.location?.height.toFixed(2)} km
- Velocity: ${velocity} km/s
- Inclination: ${inclination}°
- Epoch: ${epoch}
        `;
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !satellite || isGenerating) return;

        const userMessage: Message = { sender: 'user' as const, text: chatInput };
        setMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setIsGenerating(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const satelliteData = getSatelliteContext();
            const prompt = `${t('satelliteInfoPanel.aiAssistant.promptSystem')}\n\n${t('satelliteInfoPanel.aiAssistant.satelliteDataHeader')}\n${satelliteData}\n\n${t('satelliteInfoPanel.aiAssistant.questionHeader')}\n${userMessage.text}`;

            const response = await ai.models.generateContent({
                model: aiModel,
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                },
            });
            
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources = groundingChunks
                ?.filter((chunk: any) => chunk.web?.uri)
                .map((chunk: any) => ({
                    web: {
                        uri: chunk.web.uri,
                        title: chunk.web.title || '',
                    },
                })) || [];

            const geminiMessage: Message = { 
                sender: 'gemini' as const, 
                text: response.text,
                sources: sources,
            };
            setMessages(prev => [...prev, geminiMessage]);

        } catch (error) {
            console.error("Gemini API call failed", error);
            const errorMessage: Message = { sender: 'gemini' as const, text: t('satelliteInfoPanel.aiAssistant.error') };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!satellite || isGenerating) return;

        const userMessage: Message = { sender: 'user', text: t('satelliteInfoPanel.aiAssistant.reportRequest') };
        setMessages(prev => [userMessage]);
        setIsGenerating(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const satelliteData = getSatelliteContext();
            const prompt = `${t('satelliteInfoPanel.aiAssistant.reportSystem')}\n\n${t('satelliteInfoPanel.aiAssistant.satelliteDataHeader')}\n${satelliteData}`;

            const response = await ai.models.generateContent({
                model: aiModel,
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                },
            });

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources = groundingChunks
                ?.filter((chunk: any) => chunk.web?.uri)
                .map((chunk: any) => ({
                    web: {
                        uri: chunk.web.uri,
                        title: chunk.web.title || '',
                    },
                })) || [];

            const geminiMessage: Message = { 
                sender: 'gemini', 
                text: response.text,
                sources: sources,
            };
            setMessages(prev => [...prev, geminiMessage]);
        } catch (error) {
            console.error("Gemini API call for report failed", error);
            const errorMessage: Message = { sender: 'gemini' as const, text: t('satelliteInfoPanel.aiAssistant.reportError') };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsGenerating(false);
        }
    };

    const renderContent = () => {
        if (!satellite) {
            return (
                <div className="flex-grow flex flex-col justify-center items-center text-gray-400">
                    <p className={`animate-pulse ${isEmbedded ? 'text-3xl' : 'text-2xl'}`}>{t('satelliteInfoPanel.noTarget')}</p>
                    <p className={`text-center ${isEmbedded ? 'text-base' : 'text-sm'}`}>{t('satelliteInfoPanel.noTargetHint')}</p>
                </div>
            );
        }

        const altitude = satellite.location ? satellite.location.height.toFixed(2) : '...';
        const latitude = satellite.location ? satellite.location.latitude.toFixed(4) : '...';
        const longitude = satellite.location ? satellite.location.longitude.toFixed(4) : '...';
        const inclination = satellite.satrec ? (satellite.satrec.inclo * (180 / Math.PI)).toFixed(4) : 'N/A';
        const velocity = satellite.velocity 
            ? Math.sqrt(satellite.velocity.x**2 + satellite.velocity.y**2 + satellite.velocity.z**2).toFixed(3) 
            : 'N/A';
        
        const epoch = satellite.satrec ? julianToDateString(satellite.satrec.jdsatepoch) : 'N/A';
        const eccentricity = satellite.satrec ? satellite.satrec.ecco.toFixed(6) : 'N/A';
        const raan = satellite.satrec ? (satellite.satrec.nodeo * (180 / Math.PI)).toFixed(4) : 'N/A';
        const revNumber = satellite.satrec ? (satellite.satrec as any).revnum : 'N/A';

        if (isEmbedded) {
            if (viewMode === 'details') {
                return (
                    <div key={`details-${animationKey}`} className="flex flex-col h-full animate-fade-in">
                        {/* Mobile Header */}
                        <div className="text-center mb-4 flex-shrink-0">
                            <h3 className="text-3xl font-bold text-gray-100 tracking-wider [text-shadow:0_0_8px_#ffffff] truncate">{satellite.name}</h3>
                            <p className="text-sm text-gray-400">NORAD ID: {satellite.id} | {t(`categories.${satellite.category}`)}</p>
                        </div>

                        {/* Scrollable Area */}
                        <div className="flex-grow min-h-0 overflow-y-auto pr-2">
                            {/* Main Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <MetricCard label={t('satelliteInfoPanel.labels.altitude')} value={altitude} unit={t('satelliteInfoPanel.units.km')} />
                                <MetricCard label={t('satelliteInfoPanel.labels.velocity')} value={velocity} unit={t('satelliteInfoPanel.units.kms')} />
                                <MetricCard label={t('satelliteInfoPanel.labels.inclination')} value={inclination} unit={t('satelliteInfoPanel.units.deg')} />
                                <MetricCard label={t('satelliteInfoPanel.labels.eccentricity')} value={eccentricity} />
                            </div>
                            
                            {/* Satellite Details List */}
                             <div className="mb-4">
                                <h4 className="text-base text-gray-300 my-3">{t('satelliteInfoPanel.mobile.orbitParams')}</h4>
                                <InfoRow label={t('satelliteInfoPanel.labels.latitude')} value={latitude} unit={t('satelliteInfoPanel.units.deg')} isEmbedded={isEmbedded}/>
                                <InfoRow label={t('satelliteInfoPanel.labels.longitude')} value={longitude} unit={t('satelliteInfoPanel.units.deg')} isEmbedded={isEmbedded}/>
                                <InfoRow label={t('satelliteInfoPanel.labels.raan')} value={raan} unit={t('satelliteInfoPanel.units.deg')} isEmbedded={isEmbedded}/>
                                <InfoRow label={t('satelliteInfoPanel.labels.revNumber')} value={revNumber} isEmbedded={isEmbedded}/>
                                <InfoRow label={t('satelliteInfoPanel.labels.epochUTC')} value={epoch} isEmbedded={isEmbedded}/>
                            </div>
                        </div>
                    </div>
                );
            }
            if (viewMode === 'ai') {
                 return (
                    <div key={`ai-${animationKey}`} className="flex flex-col h-full animate-fade-in">
                        <div className="text-center mb-2 flex-shrink-0">
                            <p className="text-sm text-gray-400">{t('satelliteInfoPanel.aiAssistant.mobileTargetPrefix')}</p>
                            <h3 className="text-lg font-bold text-gray-100 truncate">{satellite.name}</h3>
                        </div>
                        {/* AI Assistant */}
                        <div className="flex-grow min-h-0 flex flex-col gap-2">
                            <div ref={chatContainerRef} className="flex-grow bg-black/30 p-2 border border-gray-600/50 space-y-3 overflow-y-auto">
                                {messages.length === 0 && !isGenerating && (
                                    <p className="text-gray-500 text-center pt-4 text-base">{t('satelliteInfoPanel.aiAssistant.promptPlaceholder')}</p>
                                )}
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-2 rounded-lg text-base ${msg.sender === 'user' ? 'bg-gray-700/50 text-gray-100' : 'bg-gray-800/50 text-gray-300'}`}>
                                            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                            {msg.sources && msg.sources.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-600/50">
                                                    <h4 className="text-sm font-bold text-gray-400/80 mb-1">{t('satelliteInfoPanel.aiAssistant.sources')}</h4>
                                                    <ul className="text-sm space-y-1">
                                                        {msg.sources.map((source, i) => (
                                                            <li key={i} className="truncate">
                                                                <a
                                                                    href={source.web.uri}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={source.web.uri}
                                                                    className="text-gray-300 hover:underline"
                                                                >
                                                                    {`[${i + 1}] ${source.web.title || new URL(source.web.uri).hostname}`}
                                                                </a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isGenerating && (
                                    <div className="flex items-start">
                                        <div className="max-w-[85%] p-2 rounded-lg text-base bg-gray-800/50 text-gray-300">
                                        <p className="animate-pulse">{t('satelliteInfoPanel.aiAssistant.analyzing')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0 pt-2">
                                <button
                                    onClick={handleGenerateReport}
                                    disabled={isGenerating}
                                    className="w-full bg-gray-700/60 border border-gray-500/50 text-gray-100 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-3 text-base"
                                >
                                    {t('satelliteInfoPanel.aiAssistant.generateReport')}
                                </button>
                                <form onSubmit={handleChatSubmit} className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={t('satelliteInfoPanel.aiAssistant.inputPlaceholder')}
                                        disabled={isGenerating}
                                        className="w-full bg-black/50 border border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-500 disabled:opacity-50 p-3 text-base"
                                    />
                                    <button type="submit" disabled={isGenerating || !chatInput.trim()} className="bg-gray-600/50 border border-gray-500/50 text-gray-100 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-6">
                                        {t('satelliteInfoPanel.aiAssistant.submit')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                );
            }
        }

        return (
             <div className="flex flex-col h-full">
                <div className="flex-grow min-h-0 overflow-y-auto pr-2">
                    {/* --- Satellite Details --- */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isDetailsMinimized ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                        <div className="flex-shrink-0">
                            <InfoRow label={t('satelliteInfoPanel.labels.id')} value={satellite.id} />
                            <InfoRow label={t('satelliteInfoPanel.labels.name')} value={satellite.name} />
                            <InfoRow label={t('satelliteInfoPanel.labels.category')} value={t(`categories.${satellite.category}`)} />
                            <InfoRow label={t('satelliteInfoPanel.labels.altitude')} value={altitude} unit={t('satelliteInfoPanel.units.km')} />
                            <InfoRow label={t('satelliteInfoPanel.labels.latitude')} value={latitude} unit={t('satelliteInfoPanel.units.deg')} />
                            <InfoRow label={t('satelliteInfoPanel.labels.longitude')} value={longitude} unit={t('satelliteInfoPanel.units.deg')} />
                            <InfoRow label={t('satelliteInfoPanel.labels.inclination')} value={inclination} unit={t('satelliteInfoPanel.units.deg')} />
                            <InfoRow label={t('satelliteInfoPanel.labels.velocity')} value={velocity} unit={t('satelliteInfoPanel.units.kms')} />
                            <InfoRow label={t('satelliteInfoPanel.labels.raan')} value={raan} unit={t('satelliteInfoPanel.units.deg')} />
                            <InfoRow label={t('satelliteInfoPanel.labels.eccentricity')} value={eccentricity} />
                            <InfoRow label={t('satelliteInfoPanel.labels.revNumber')} value={revNumber} />
                            <InfoRow label={t('satelliteInfoPanel.labels.epochUTC')} value={epoch} />
                        </div>
                    </div>

                    {/* --- AI Assistant --- */}
                    <div className={`flex flex-col gap-2 pt-2 border-t-2 border-gray-400/80 transition-all duration-500 ${isDetailsMinimized ? 'mt-0' : 'mt-2'}`}>
                        <h3 className="text-md text-gray-300 [text-shadow:0_0_5px_#ffffff] flex-shrink-0">{t('satelliteInfoPanel.aiAssistant.title')}</h3>
                        <div ref={chatContainerRef} className="bg-black/30 p-2 border border-gray-600/50 space-y-3">
                            {messages.length === 0 && !isGenerating && (
                                <p className="text-gray-500 text-center pt-4 text-sm">{t('satelliteInfoPanel.aiAssistant.promptPlaceholder')}</p>
                            )}
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-2 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-gray-700/50 text-gray-100' : 'bg-gray-800/50 text-gray-300'}`}>
                                        <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-600/50">
                                                <h4 className="text-sm font-bold text-gray-400/80 mb-1">{t('satelliteInfoPanel.aiAssistant.sources')}</h4>
                                                <ul className="text-sm space-y-1">
                                                    {msg.sources.map((source, i) => (
                                                        <li key={i} className="truncate">
                                                            <a
                                                                href={source.web.uri}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title={source.web.uri}
                                                                className="text-gray-300 hover:underline"
                                                            >
                                                                {`[${i + 1}] ${source.web.title || new URL(source.web.uri).hostname}`}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isGenerating && (
                                <div className="flex items-start">
                                    <div className="max-w-[85%] p-2 rounded-lg text-sm bg-gray-800/50 text-gray-300">
                                    <p className="animate-pulse">{t('satelliteInfoPanel.aiAssistant.analyzing')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                                onClick={handleGenerateReport}
                                disabled={isGenerating}
                                className="w-full bg-gray-700/60 border border-gray-500/50 text-gray-100 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-2"
                            >
                                {t('satelliteInfoPanel.aiAssistant.generateReport')}
                            </button>
                            <form onSubmit={handleChatSubmit} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={t('satelliteInfoPanel.aiAssistant.inputPlaceholder')}
                                    disabled={isGenerating}
                                    className="w-full bg-black/50 border border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-500 disabled:opacity-50 p-1.5"
                                />
                                <button type="submit" disabled={isGenerating || !chatInput.trim()} className="bg-gray-600/50 border border-gray-500/50 text-gray-100 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-4">
                                    {t('satelliteInfoPanel.aiAssistant.submit')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

               {!isEmbedded && (
                <div className="flex-shrink-0 mt-auto pt-2">
                    <button 
                        onClick={onToggleSatelliteView}
                        className={`w-full mt-2 p-2 text-center font-bold transition-all duration-300 border border-gray-500/50 ${isSatelliteView ? 'bg-gray-200 text-black hover:bg-white shadow-lg shadow-white/20' : 'bg-transparent text-gray-300 hover:bg-white/10'}`}
                    >
                        {isSatelliteView ? t('satelliteInfoPanel.satelliteView.exit') : t('satelliteInfoPanel.satelliteView.enter')}
                    </button>
                </div>
               )}
            </div>
        );
    };

    const panelContent = (
        <div className="h-full flex flex-col">
            {!isEmbedded && (
                <div className="flex justify-between items-center border-b-2 border-gray-400/80 pb-2 mb-2 flex-shrink-0">
                    <h2 className={`text-gray-200 [text-shadow:0_0_8px_#ffffff] text-xl`}>{t('satelliteInfoPanel.title')}</h2>
                    <button 
                        onClick={() => setIsDetailsMinimized(!isDetailsMinimized)}
                        className="text-xs bg-gray-800/50 border border-gray-600 px-2 py-0.5 hover:bg-gray-700/50 text-gray-300 transition-colors"
                    >
                        {isDetailsMinimized ? t('satelliteInfoPanel.toggleDetails.expand') : t('satelliteInfoPanel.toggleDetails.minimize')}
                    </button>
                </div>
            )}
            <div className="flex-grow min-h-0 overflow-hidden">
                 {renderContent()}
            </div>
        </div>
    );

    if (isEmbedded) {
        return (
            <div className="p-4 pt-2 h-full">
                {panelContent}
            </div>
        );
    }

    return (
        <div 
            className="h-full flex flex-col bg-black/50 backdrop-blur-sm border border-gray-500/50 p-4 shadow-lg shadow-gray-500/10"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}
        >
            {panelContent}
        </div>
    );
};

export default SatelliteInfoPanel;