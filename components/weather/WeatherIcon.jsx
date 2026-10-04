import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";

// Maps WMO weather codes (what Open-Meteo returns) to an icon.
export default function WeatherIcon({ code, isDay = true, className }) {
  const props = { "aria-hidden": true, className };

  if (code === 0 || code === 1) return isDay ? <Sun {...props} /> : <Moon {...props} />;
  if (code === 2) return isDay ? <CloudSun {...props} /> : <CloudMoon {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code === 45 || code === 48) return <CloudFog {...props} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain {...props} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  return <Cloud {...props} />;
}