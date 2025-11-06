export const EARTH_RADIUS = 6371; // km

const CORS_PROXY = 'https://corsproxy.io/?';

export const TLE_CATEGORIES: { [key: string]: { url: string } } = {
    STATIONS: { url: `${CORS_PROXY}https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle` },
    GPS: { url: `${CORS_PROXY}https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle` },
    WEATHER: { url: `${CORS_PROXY}https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle` },
    STARLINK: { url: `${CORS_PROXY}https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle` },
    DEBRIS: { url: `${CORS_PROXY}https://celestrak.org/NORAD/elements/gp.php?GROUP=debris&FORMAT=tle` },
    SPECIAL: { url: `${CORS_PROXY}https://celestrak.org/NORAD/elements/gp.php?GROUP=spire&FORMAT=tle`},
};