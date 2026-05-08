export type WeatherCurrent = {
	temp: number;
	feelsLike: number;
	humidity: number;
	windSpeed: number;
	code: number;
	label: string;
	emoji: string;
};

export type WeatherDay = {
	date: string;
	high: number;
	low: number;
	code: number;
	emoji: string;
};

export type WeatherData = {
	current: WeatherCurrent;
	forecast: WeatherDay[]; // next 3 days (excludes today)
	city: string;
	unit: 'fahrenheit' | 'celsius';
	fetchedAt: number;
};

export type WeatherConfig = {
	lat: string;
	lon: string;
	city: string;
	unit: 'fahrenheit' | 'celsius';
};

const WMO: Record<number, { label: string; emoji: string }> = {
	0:  { label: 'Clear',          emoji: '☀️'  },
	1:  { label: 'Mainly clear',   emoji: '🌤️'  },
	2:  { label: 'Partly cloudy',  emoji: '⛅'  },
	3:  { label: 'Overcast',       emoji: '☁️'  },
	45: { label: 'Foggy',          emoji: '🌫️'  },
	48: { label: 'Icy fog',        emoji: '🌫️'  },
	51: { label: 'Light drizzle',  emoji: '🌦️'  },
	53: { label: 'Drizzle',        emoji: '🌦️'  },
	55: { label: 'Heavy drizzle',  emoji: '🌦️'  },
	61: { label: 'Light rain',     emoji: '🌧️'  },
	63: { label: 'Rain',           emoji: '🌧️'  },
	65: { label: 'Heavy rain',     emoji: '🌧️'  },
	71: { label: 'Light snow',     emoji: '🌨️'  },
	73: { label: 'Snow',           emoji: '❄️'   },
	75: { label: 'Heavy snow',     emoji: '❄️'   },
	77: { label: 'Snow grains',    emoji: '🌨️'  },
	80: { label: 'Showers',        emoji: '🌦️'  },
	81: { label: 'Showers',        emoji: '🌦️'  },
	82: { label: 'Heavy showers',  emoji: '🌦️'  },
	85: { label: 'Snow showers',   emoji: '🌨️'  },
	86: { label: 'Snow showers',   emoji: '🌨️'  },
	95: { label: 'Thunderstorm',   emoji: '⛈️'  },
	96: { label: 'Thunderstorm',   emoji: '⛈️'  },
	99: { label: 'Thunderstorm',   emoji: '⛈️'  },
};

export function wmo(code: number) {
	// Find exact or nearest lower code
	const entry = WMO[code] ?? WMO[Math.max(...Object.keys(WMO).map(Number).filter(k => k <= code))] ?? { label: 'Unknown', emoji: '🌡️' };
	return entry;
}

export async function fetchWeather(config: WeatherConfig): Promise<WeatherData> {
	const unit = config.unit;
	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', config.lat);
	url.searchParams.set('longitude', config.lon);
	url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code');
	url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
	url.searchParams.set('temperature_unit', unit);
	url.searchParams.set('wind_speed_unit', 'mph');
	url.searchParams.set('timezone', 'auto');
	url.searchParams.set('forecast_days', '4');

	const res = await fetch(url.toString());
	if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

	const raw = await res.json() as {
		current: {
			temperature_2m: number;
			apparent_temperature: number;
			relative_humidity_2m: number;
			wind_speed_10m: number;
			weather_code: number;
		};
		daily: {
			time: string[];
			weather_code: number[];
			temperature_2m_max: number[];
			temperature_2m_min: number[];
		};
	};

	const code = raw.current.weather_code;
	const current: WeatherCurrent = {
		temp: Math.round(raw.current.temperature_2m),
		feelsLike: Math.round(raw.current.apparent_temperature),
		humidity: raw.current.relative_humidity_2m,
		windSpeed: Math.round(raw.current.wind_speed_10m),
		code,
		...wmo(code)
	};

	// daily[0] is today; we want the next 3 days
	const forecast: WeatherDay[] = raw.daily.time.slice(1, 4).map((date, i) => {
		const dayCode = raw.daily.weather_code[i + 1];
		return {
			date,
			high: Math.round(raw.daily.temperature_2m_max[i + 1]),
			low: Math.round(raw.daily.temperature_2m_min[i + 1]),
			code: dayCode,
			emoji: wmo(dayCode).emoji
		};
	});

	return { current, forecast, city: config.city, unit, fetchedAt: Date.now() };
}
