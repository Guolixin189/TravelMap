# Take Me Somewhere ✈️

An interactive travel-discovery site: **type a city to fly there**, or **describe a vibe** ("warm beach", "极光") and let AI pick the destination for you. The map glides to the place, then shows live weather, photos, and a short city guide.

**Live site:** https://guolixin189.github.io/TravelMap/

## Features

- **City search** — type any city in English or Chinese ("Kyoto", "巴黎") and the map animates there
- **Vibe search** — describe a mood ("warm beach", "northern lights", "quiet old town") and AI recommends a matching destination
- **Live weather** — current conditions for the destination via Open-Meteo
- **Photo carousel** — destination photos inside the info drawer
- **Inspiration chips** — one-tap prompts like "coldest place on earth" for spontaneous exploring
- **Offline fallback** — a built-in 30-city database (EN/ZH keywords) answers vibe queries when no API key is set or the AI is unreachable, so the site never feels broken
- **Smart routing** — mood hints keep "warm beach" from geocoding to Warm Beach, WA; rapid consecutive searches can't show stale results
- **Polished map UX** — pulsing destination marker, floating city label, soft street-map style with full global coverage

## How It Works

| You type...              | What happens                                                        |
|--------------------------|---------------------------------------------------------------------|
| A city name (`Kyoto`)    | Open-Meteo geocoding → map flies there → weather + photos + guide   |
| A vibe (`warm beach`)    | OpenRouter AI picks a destination → map flies there                 |
| A vibe, but no API key   | Local 30-city database scores the best match offline                |

The AI key is **optional** — everything except AI vibe search works without one.

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Map        | OpenLayers (CartoDB Voyager-style street tiles) |
| Geocoding  | Open-Meteo Geocoding API (free, no key)         |
| Weather    | Open-Meteo Forecast API (free, no key)          |
| AI         | OpenRouter API (`qwen/qwen3.8-27b:free`)        |
| Frontend   | Vanilla HTML / CSS / JavaScript (no build step) |
| Hosting    | GitHub Pages                                    |

## Project Structure

```
├── index.html       # Layout: title, map, bottom search dock
├── styles.css       # Styling
├── script.js        # Search, AI, map animation, drawer UI
└── local-cities.js  # Offline 30-city recommendation database
```

## Usage

1. Open the site and type in the bottom search bar — a city name or a vibe
2. Hit Enter (or a chip) — the map flies to the destination
3. Read the weather, swipe the photo carousel, and explore the drawer
4. **AI vibe search**: open settings (click the title 5 times), paste an [OpenRouter API key](https://openrouter.ai/keys) — it's stored only in your browser's localStorage, never sent anywhere else

## API Key Setup (optional)

Vibe search uses OpenRouter's free tier (50 requests/day per account, shared across keys). Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys), then open the hidden settings panel by **clicking the page title 5 times** and paste it in. Direct city searches never need a key.

## Deploy

It's a fully static site — no backend, no build:

1. Push these files to a GitHub repo
2. Repo **Settings → Pages** → deploy from the `main` branch (root)
3. Your site is live at `https://<username>.github.io/<repo>/`

> **Cache-busting:** after changing `script.js` / `styles.css` / `local-cities.js`, bump the `?v=` query in `index.html` (e.g. `script.js?v=20260929h`) so returning visitors don't get a stale cached copy. GitHub Pages itself redeploys in ~1–3 minutes.

## Run Locally

No dependencies — serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Notes

- Free-model availability on OpenRouter changes over time — if vibe search suddenly fails, check that the configured model still exists in [OpenRouter's model list](https://openrouter.ai/models) and update `OPENROUTER_MODEL` in `script.js`.
- Map tiles and the Open-Meteo APIs are free and keyless.
