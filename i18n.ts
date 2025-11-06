import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// --- Translation Data ---
const translations: { [key:string]: any } = {
  en: {
    "hud": {
      "title": "Military Satellite Tracker"
    },
    "globe": {
      "loadingAssets": "Loading 3D Assets..."
    },
    "satelliteInfoPanel": {
      "title": "TARGET INFORMATION",
      "toggleDetails": {
        "minimize": "Minimize Details",
        "expand": "Expand Details"
      },
      "noTarget": "NO TARGET SELECTED",
      "noTargetHint": "Select a target from the list or globe.",
      "labels": {
        "id": "ID",
        "name": "Name",
        "category": "Category",
        "altitude": "Altitude",
        "latitude": "Latitude",
        "longitude": "Longitude",
        "inclination": "Inclination",
        "velocity": "Velocity",
        "raan": "RAAN",
        "eccentricity": "Eccentricity",
        "revNumber": "Epoch Rev",
        "epochUTC": "Epoch (UTC)"
      },
      "units": {
        "km": "km",
        "kms": "km/s",
        "deg": "°"
      },
      "satelliteView": {
        "enter": "ENTER SATELLITE VIEW",
        "exit": "EXIT SATELLITE VIEW"
      },
      "aiAssistant": {
        "title": "AI ASSISTANT",
        "promptPlaceholder": "Enter a question or generate a report.",
        "inputPlaceholder": "Or, ask a specific question...",
        "generateReport": "Generate Report on this Satellite",
        "submit": "Submit",
        "analyzing": "Analyzing...",
        "error": "Error: Could not get a response from AI.",
        "reportError": "Error: Could not generate report.",
        "reportRequest": "Generate a report on this satellite.",
        "sources": "Sources:",
        "promptSystem": "You are a satellite information analyst. Your responses must be concise and accurate. Briefly analyze the provided satellite data and answer the user's question. Use Google Search to find the latest information if necessary. Do not use markdown tables or any table-like formatting. Use lists or paragraphs instead.",
        "reportSystem": "You are a satellite information analyst. Your response must be a comprehensive intelligence report. Analyze the provided satellite data and report on its presumed purpose, capabilities, and current operational status. Use Google Search for the latest public information to supplement your analysis if necessary. Do not use markdown tables or any table-like formatting. Use lists or paragraphs instead.",
        "satelliteDataHeader": "Satellite Data:",
        "questionHeader": "Question:",
        "mobileTargetPrefix": "AI Analysis Target:"
      },
      "mobile": {
        "header": {
          "info": "Info",
          "ai": "AI"
        },
        "orbitParams": "Detailed Orbital Parameters"
      }
    },
    "satelliteList": {
      "title": "SATELLITE INTEL",
      "fetching": "ACQUIRING SIGNAL...",
      "noResults": "No Matching Satellites",
      "noResultsHint": "Adjust filters or select categories.",
      "filters": {
        "button": "Settings",
        "header": "Settings & Filters",
        "reset": "Reset",
        "resetAll": "Reset Filters",
        "searchPlaceholder": "Search by Name / NORAD ID...",
        "category": "Category:",
        "altitude": "Altitude (km):",
        "min": "Min",
        "max": "Max",
        "globeStyle": "Globe Style:",
        "language": "Language:",
        "aiModel": "AI Model:",
        "showAllOrbits": "Show All Orbits",
        "highVisOrbits": "High Visibility Mode"
      }
    },
    "mobile": {
      "header": {
        "list": "Satellite List"
      },
      "backToList": "List"
    },
    "categories": {
      "STATIONS": "Space Stations",
      "GPS": "GPS",
      "WEATHER": "Weather",
      "STARLINK": "Starlink",
      "DEBRIS": "Space Debris",
      "SPECIAL": "Special Interest"
    },
    "globeStyles": {
      "Holographic": "Holographic",
      "Grid": "Grid",
      "Solid": "Solid",
      "Atmosphere": "Atmosphere",
      "Blueprint": "Blueprint",
      "Wireframe": "Wireframe",
      "Outline": "Outline"
    },
    "satelliteStatus": {
      "OPERATIONAL": "OPERATIONAL",
      "DEGRADED": "DEGRADED",
      "INACTIVE": "INACTIVE",
      "STEALTH": "STEALTH",
      "DE-ORBIT BURN": "DE-ORBIT BURN"
    }
  },
  ja: {
    "hud": {
      "title": "軍事衛星トラッカー"
    },
    "globe": {
      "loadingAssets": "3Dアセットを読み込み中..."
    },
    "satelliteInfoPanel": {
      "title": "ターゲット情報",
      "toggleDetails": {
        "minimize": "詳細を最小化",
        "expand": "詳細を展開"
      },
      "noTarget": "ターゲット未選択",
      "noTargetHint": "リストまたは地球儀からターゲットを選択してください。",
      "labels": {
        "id": "ID",
        "name": "名称",
        "category": "カテゴリ",
        "altitude": "高度",
        "latitude": "緯度",
        "longitude": "経度",
        "inclination": "軌道傾斜角",
        "velocity": "速度",
        "raan": "昇交点赤経",
        "eccentricity": "離心率",
        "revNumber": "元期周回数",
        "epochUTC": "元期 (UTC)"
      },
      "units": {
        "km": "km",
        "kms": "km/s",
        "deg": "°"
      },
      "satelliteView": {
        "enter": "サテライトビューへ移行",
        "exit": "サテライトビューを終了"
      },
      "aiAssistant": {
        "title": "AIアシスタント",
        "promptPlaceholder": "質問を入力するか、レポートを生成してください。",
        "inputPlaceholder": "または、具体的な質問を入力...",
        "generateReport": "この衛星についてのレポートを作成",
        "submit": "送信",
        "analyzing": "分析中...",
        "error": "エラー: AIから応答を取得できませんでした。",
        "reportError": "エラー: レポートを生成できませんでした。",
        "reportRequest": "この衛星についてのレポートを作成してください。",
        "sources": "情報源:",
        "promptSystem": "あなたは衛星情報分析官です。あなたの応答は簡潔かつ的確でなければなりません。提供された以下の衛星データを簡潔に分析し、ユーザーの質問に答えてください。必要に応じてGoogle検索を使用して最新の情報を調べてください。マークダウンテーブルや表形式のフォーマットは使用しないでください。代わりにリストや段落を使用してください。",
        "reportSystem": "あなたは衛星情報分析官です。あなたの応答は、包括的なインテリジェンスレポートでなければなりません。提供された以下の衛星のデータを分析し、その想定される目的、能力、現在の運用状況について報告してください。分析を補足するために、必要に応じてGoogle検索を使用して最新の公開情報を活用してください。マークダウンテーブルや表形式のフォーマットは使用しないでください。代わりにリストや段落を使用してください。",
        "satelliteDataHeader": "衛星データ:",
        "questionHeader": "質問:",
        "mobileTargetPrefix": "AI分析対象:"
      },
      "mobile": {
        "header": {
          "info": "情報",
          "ai": "AI"
        },
        "orbitParams": "詳細軌道パラメータ"
      }
    },
    "satelliteList": {
      "title": "衛星情報",
      "fetching": "シグナル収集中...",
      "noResults": "該当する衛星がありません",
      "noResultsHint": "フィルターを調整するか、カテゴリを選択してください。",
      "filters": {
        "button": "設定",
        "header": "設定 & フィルター",
        "reset": "リセット",
        "resetAll": "フィルターをリセット",
        "searchPlaceholder": "名称 / NORAD IDで検索...",
        "category": "カテゴリ:",
        "altitude": "高度 (km):",
        "min": "最小",
        "max": "最大",
        "globeStyle": "地球儀スタイル:",
        "language": "言語:",
        "aiModel": "AIモデル:",
        "showAllOrbits": "全軌道を表示",
        "highVisOrbits": "高視認モード"
      }
    },
    "mobile": {
      "header": {
        "list": "衛星リスト"
      },
      "backToList": "リスト"
    },
    "categories": {
      "STATIONS": "宇宙ステーション",
      "GPS": "GPS",
      "WEATHER": "気象衛星",
      "STARLINK": "スターリンク",
      "DEBRIS": "宇宙デブリ",
      "SPECIAL": "特別関心"
    },
    "globeStyles": {
      "Holographic": "ホログラフィック",
      "Grid": "グリッド",
      "Solid": "ソリッド",
      "Atmosphere": "大気",
      "Blueprint": "ブループリント",
      "Wireframe": "ワイヤーフレーム",
      "Outline": "アウトライン"
    },
    "satelliteStatus": {
      "OPERATIONAL": "稼働中",
      "DEGRADED": "機能低下",
      "INACTIVE": "非アクティブ",
      "STEALTH": "ステルス",
      "DE-ORBIT BURN": "軌道離脱"
    }
  }
};


type I18nContextType = {
  t: (key: string) => string;
  language: string;
  setLanguage: (lang: string) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const getNestedValue = (obj: any, key: string): string | undefined => {
  return key.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang && translations[storedLang]) {
      return storedLang;
    }
    const userLang = navigator.language.split('-')[0];
    return translations[userLang] ? userLang : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = useCallback((key: string): string => {
    const langStore = translations[language] || translations['en'];
    return getNestedValue(langStore, key) || key;
  }, [language]);
  
  const setLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguageState(lang);
    }
  };

  const value = { t, language, setLanguage };

  // FIX: Replaced JSX with React.createElement to support .ts file extension and avoid parsing errors.
  return React.createElement(I18nContext.Provider, { value: value }, children) as React.ReactElement;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};