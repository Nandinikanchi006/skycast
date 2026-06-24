
import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_KEY = "222a6a54ee64663e885e703359c91855"; // Replace with your key
const USE_DUMMY = !API_KEY || API_KEY === "222a6a54ee64663e885e703359c91855";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const DUMMY_DATA = {
  current: {
    city: "San Francisco",
    country: "US",
    temp: 18,
    feelsLike: 16,
    condition: "Partly Cloudy",
    description: "scattered clouds",
    humidity: 72,
    wind: 14,
    visibility: 10,
    icon: "02d",
    sunrise: "6:23 AM",
    sunset: "8:41 PM",
  },
  forecast: [
    { day: "Mon", icon: "01d", high: 21, low: 13, condition: "Sunny" },
    { day: "Tue", icon: "10d", high: 16, low: 11, condition: "Rainy" },
    { day: "Wed", icon: "04d", high: 14, low: 10, condition: "Cloudy" },
    { day: "Thu", icon: "02d", high: 19, low: 12, condition: "P. Cloudy" },
    { day: "Fri", icon: "01d", high: 23, low: 14, condition: "Sunny" },
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const iconUrl = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;

const getWeatherGradient = (condition = "") => {
  const c = condition.toLowerCase();
  if (c.includes("clear") || c.includes("sun")) return "from-amber-900/40 via-orange-900/30 to-yellow-900/20";
  if (c.includes("rain") || c.includes("drizzle")) return "from-slate-900/60 via-blue-900/40 to-cyan-900/30";
  if (c.includes("snow")) return "from-slate-800/50 via-blue-800/30 to-indigo-900/20";
  if (c.includes("thunder") || c.includes("storm")) return "from-gray-900/70 via-violet-900/40 to-purple-900/30";
  return "from-slate-900/50 via-blue-900/30 to-indigo-900/20";
};

// ─── API FETCHERS ─────────────────────────────────────────────────────────────
async function fetchWeather(city) {
  if (USE_DUMMY) {
    await new Promise((r) => setTimeout(r, 900));
    if (city.toLowerCase() === "error") throw new Error("City not found");
    return { ...DUMMY_DATA, current: { ...DUMMY_DATA.current, city } };
  }

  const base = "https://api.openweathermap.org/data/2.5";
  const params = `q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

  const [curRes, frcRes] = await Promise.all([
    fetch(`${base}/weather?${params}`),
    fetch(`${base}/forecast?${params}`),
  ]);

  if (!curRes.ok) throw new Error("City not found. Please check the spelling.");
  const cur = await curRes.json();
  const frc = await frcRes.json();

  const toTime = (unix) =>
    new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daily = frc.list
    .filter((_, i) => i % 8 === 0)
    .slice(0, 5)
    .map((item) => ({
      day: days[new Date(item.dt * 1000).getDay()],
      icon: item.weather[0].icon,
      high: Math.round(item.main.temp_max),
      low: Math.round(item.main.temp_min),
      condition: item.weather[0].main,
    }));

  return {
    current: {
      city: cur.name,
      country: cur.sys.country,
      temp: Math.round(cur.main.temp),
      feelsLike: Math.round(cur.main.feels_like),
      condition: cur.weather[0].main,
      description: cur.weather[0].description,
      humidity: cur.main.humidity,
      wind: Math.round(cur.wind.speed * 3.6),
      visibility: Math.round((cur.visibility || 10000) / 1000),
      icon: cur.weather[0].icon,
      sunrise: toTime(cur.sys.sunrise),
      sunset: toTime(cur.sys.sunset),
    },
    forecast: daily,
  };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

// Search Bar
function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const q = query.trim();
    if (q) onSearch(q);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="relative flex gap-2 w-full max-w-md mx-auto">
      <div className="relative flex-1">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Search city…"
          disabled={loading}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/50 transition-all duration-200 disabled:opacity-50"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !query.trim()}
        className="px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 shadow-lg shadow-sky-500/30"
      >
        Go
      </button>
    </div>
  );
}

// Loading Spinner
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-sky-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-sky-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
      <p className="text-slate-400 text-sm tracking-wide animate-pulse">Fetching weather…</p>
    </div>
  );
}

// Error Message
function ErrorMsg({ message }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500/15 border border-red-400/30 backdrop-blur-sm max-w-md mx-auto">
      <span className="text-2xl">⚠️</span>
      <div>
        <p className="text-red-300 font-medium text-sm">{message}</p>
        <p className="text-red-400/70 text-xs mt-0.5">Try another city name</p>
      </div>
    </div>
  );
}

// Stat Card (humidity, wind, etc.)
function StatCard({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-sm hover:bg-white/12 hover:border-white/20 transition-all duration-200 group">
      <span className="text-xl group-hover:scale-110 transition-transform duration-200">{icon}</span>
      <span className="text-slate-400 text-xs font-medium tracking-wide uppercase">{label}</span>
      <span className="text-white font-semibold text-sm">{value}</span>
    </div>
  );
}

// Main Weather Card
function CurrentWeather({ data }) {
  return (
    <div className="rounded-3xl bg-white/8 border border-white/15 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {data.city}
            <span className="text-slate-400 text-xl font-normal ml-2">{data.country}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5 capitalize">{data.description}</p>
        </div>
        <img
          src={iconUrl(data.icon)}
          alt={data.condition}
          className="w-16 h-16 drop-shadow-lg -mt-1 -mr-1"
        />
      </div>

      {/* Temperature */}
      <div className="px-6 pb-5 flex items-end gap-4">
        <div className="text-7xl font-thin text-white tracking-tighter leading-none">
          {data.temp}
          <span className="text-4xl align-top mt-2 inline-block text-slate-300">°C</span>
        </div>
        <div className="pb-2 text-slate-400 text-sm">
          <div>Feels like <span className="text-white font-medium">{data.feelsLike}°</span></div>
          <div className="mt-1">{data.condition}</div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-white/10" />

      {/* Stats Grid */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard icon="💧" label="Humidity" value={`${data.humidity}%`} />
        <StatCard icon="💨" label="Wind" value={`${data.wind} km/h`} />
        <StatCard icon="👁️" label="Visibility" value={`${data.visibility} km`} />
        <StatCard icon="🌡️" label="Feels Like" value={`${data.feelsLike}°C`} />
      </div>

      {/* Sunrise / Sunset */}
      <div className="px-6 pb-5 flex gap-2.5">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-400/20">
          <span className="text-xl">🌅</span>
          <div>
            <div className="text-amber-300/80 text-xs font-medium uppercase tracking-wide">Sunrise</div>
            <div className="text-white font-semibold text-sm">{data.sunrise}</div>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-400/20">
          <span className="text-xl">🌇</span>
          <div>
            <div className="text-orange-300/80 text-xs font-medium uppercase tracking-wide">Sunset</div>
            <div className="text-white font-semibold text-sm">{data.sunset}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Single Forecast Day
function ForecastDay({ day, icon, high, low, condition }) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-sm hover:bg-white/14 hover:border-white/20 hover:-translate-y-1 transition-all duration-200 cursor-default group">
      <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{day}</span>
      <img
        src={iconUrl(icon)}
        alt={condition}
        className="w-10 h-10 group-hover:scale-110 transition-transform duration-200 drop-shadow"
      />
      <span className="text-slate-300 text-xs">{condition}</span>
      <div className="flex gap-1.5 items-center">
        <span className="text-white font-semibold text-sm">{high}°</span>
        <span className="text-slate-500 text-xs">/</span>
        <span className="text-slate-400 text-sm">{low}°</span>
      </div>
    </div>
  );
}

// 5-Day Forecast
function Forecast({ days }) {
  return (
    <div className="rounded-3xl bg-white/8 border border-white/15 backdrop-blur-xl p-5 shadow-2xl shadow-black/30">
      <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-4 px-1">
        📅 5-Day Forecast
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {days.map((d) => (
          <ForecastDay key={d.day} {...d} />
        ))}
      </div>
    </div>
  );
}

// Demo badge
function DemoBadge() {
  return USE_DUMMY ? (
    <div className="text-center mt-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-500/15 border border-amber-400/30 text-amber-300/80">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Demo mode · Add your API key to enable live data
      </span>
    </div>
  ) : null;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function WeatherApp() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (city) => {
    setLoading(true);
    setError(null);
    setWeather(null);
    try {
      const data = await fetchWeather(city);
      setWeather(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load default city on mount
  useEffect(() => {
    search("San Francisco");
  }, [search]);

  const gradient = weather ? getWeatherGradient(weather.current.condition) : "from-slate-900 via-blue-900/30 to-indigo-900/20";

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${gradient} transition-all duration-1000`}
      style={{
        background: "radial-gradient(ellipse at top left, #0f1f3d 0%, #060d1f 50%, #0a0a1a 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      {/* Main layout */}
      <div className="relative min-h-screen flex flex-col items-center px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl">🌤</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Skycast</h1>
          </div>
          <p className="text-slate-400 text-sm">Real-time weather at your fingertips</p>
        </div>

        {/* Search */}
        <div className="w-full max-w-md mb-2">
          <SearchBar onSearch={search} loading={loading} />
          <DemoBadge />
        </div>

        {/* Content */}
        <div className="w-full max-w-md mt-6 space-y-4">
          {loading && <Spinner />}
          {error && !loading && <ErrorMsg message={error} />}
          {weather && !loading && (
            <>
              <CurrentWeather data={weather.current} />
              <Forecast days={weather.forecast} />
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-10 text-slate-600 text-xs text-center">
          Powered by OpenWeatherMap · Built with React & Tailwind
        </p>
      </div>
    </div>
  );
}