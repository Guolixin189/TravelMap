/* ========= 地图：OpenLayers 引擎 + Esri World Street Map 底图（免 Key） ========= */
const map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 19,
        attributions:
          'Tiles © <a href="https://www.esri.com/">Esri</a> — Source: Esri, TomTom, Garmin, FAO, NOAA, USGS',
      }),
    }),
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([8, 22]),
    zoom: 2.4,
    minZoom: 2,
  }),
});

/* 脉冲标记：用 Overlay 在地图上挂一个 div，复用 CSS 里的脉冲动画 */
const markerEl = document.createElement("div");
markerEl.className = "pulse-marker";
markerEl.innerHTML = '<div class="ring"></div><div class="dot"></div>';
const markerOverlay = new ol.Overlay({
  element: markerEl,
  positioning: "center-center",
  stopEvent: false,
});
markerOverlay.setPosition(undefined);
map.addOverlay(markerOverlay);

/* 城市名小标签 */
const popupEl = document.createElement("div");
popupEl.className = "marker-popup";
popupEl.style.display = "none";
const popupOverlay = new ol.Overlay({
  element: popupEl,
  positioning: "bottom-center",
  offset: [0, -20],
  stopEvent: false,
});
popupOverlay.setPosition(undefined);
map.addOverlay(popupOverlay);

function setMarkerLabel(html) {
  if (!html) {
    popupEl.style.display = "none";
    popupOverlay.setPosition(undefined);
    return;
  }
  popupEl.innerHTML = html;
  popupEl.style.display = "";
}

function flyToCity(lat, lng, labelHtml) {
  const pos = ol.proj.fromLonLat([lng, lat]);
  map.getView().animate({ center: pos, zoom: 11, duration: 2200 });
  markerOverlay.setPosition(pos);
  popupOverlay.setPosition(pos);
  setMarkerLabel(labelHtml);
}

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    if (ct.includes("application/json") || ct.includes("application/ld+json")) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn(
          "Expected JSON but parse failed for:",
          url,
          text.slice(0, 300)
        );
        throw new Error("Invalid JSON from " + url);
      }
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  } catch (err) {
    console.error("fetchJSON error for", url, err);
    throw err;
  }
}

const elPref = document.getElementById("pref");
const elGo = document.getElementById("go");
const elErr = document.getElementById("err");
const drawer = document.getElementById("drawer");
const drawerToggle = document.getElementById("drawerToggle");
const closeDrawer =
  document.getElementById("closeDrawer") || drawer.querySelector(".close");

const cityTitle = document.getElementById("cityTitle");

const weatherNow = document.getElementById("weatherNow");
const sights = document.getElementById("sights");
const vibe = document.getElementById("vibe");
const distance = document.getElementById("distance");
const suggestCache = new Map();

function normKey(s) {
  return s.trim().toLowerCase();
}

drawerToggle.onclick = () => drawer.classList.toggle("open");
closeDrawer.onclick = () => drawer.classList.remove("open");

/* ========= Settings panel (API key) ========= */
const settingsPanel = document.getElementById("settings");
const settingsToggle = document.getElementById("settingsToggle");
const apiKeyInput = document.getElementById("apiKeyInput");
apiKeyInput.value = getApiKey();
settingsToggle.onclick = () => {
  settingsPanel.hidden = !settingsPanel.hidden;
};
document.getElementById("saveApiKey").onclick = () => {
  localStorage.setItem("tms_api_key", apiKeyInput.value.trim());
  settingsPanel.hidden = true;
  showResult("API Key 已保存 ✓");
};

elPref.addEventListener("keydown", (e) => {
  if (e.key === "Enter") run();
});
elGo.addEventListener("click", run);
document.querySelectorAll(".chip").forEach((c) => {
  c.addEventListener("click", () => {
    elPref.value = c.dataset.q || "";
    run();
  });
});
/* ========= AI 推荐（OpenRouter，免费模型）========
   去 https://openrouter.ai/keys 注册并创建 Key，粘贴到页面左上角 ⚙️ 设置里。
   免费模型以 ":free" 结尾，不消耗额度；想换模型改下面这一行即可。 */
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

/* ========= API key（用户在页面 ⚙️ 设置中填写，保存在本地浏览器） ========= */
function getApiKey() {
  return (localStorage.getItem("tms_api_key") || "").trim();
}

async function askAI(prompt) {
  const key = getApiKey();
  if (!key) {
    throw new Error("NO_KEY");
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
      "HTTP-Referer": location.origin,
      "X-Title": "Take Me Somewhere",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("AI 服务返回异常，请稍后重试。");
  }
  if (!res.ok) {
    const msg = data?.error?.message || ("HTTP " + res.status);
    throw new Error("AI 请求失败（" + msg + "）");
  }
  return data;
}

function buildPrompt(userPref, exclude = []) {
  // 浏览器侧无法调采样温度，这里用随机盐值 + 排除清单来制造“每次不同”
  const salt = Math.random().toString(36).slice(2, 8);

  return `
You are a travel recommender. Output ONLY valid JSON. No prose, no code fences.

User input:
"${userPref}"

Instructions:
- If the input contains a COUNTRY, REGION, or CITY name (e.g. "somewhere in China", "Qinzhou Guangxi China"), you MUST pick cities INSIDE that geography.
- If it is already a specific city (e.g. "Qinzhou, Guangxi, China"), return that exact city as the ONLY element in the list.
- Otherwise (abstract preferences like "warm romantic beach"), return 6–8 UNIQUE cities that match.
- Use ENGLISH names only.
- Each city must have geocode_query exactly "City, Country".
- Produce a DIFFERENT selection each time (diversify). token:${salt}
- EXCLUDE any of these cities (case-insensitive): ${JSON.stringify(exclude)}

Return EXACTLY this JSON and nothing else:
{
  "cities": [
    {
      "city": "<City name in English>",
      "country": "<Country in English>",
      "geocode_query": "<City, Country>",
      "short_reason": "<One sentence reason>",
      "must_see": ["<Place1>","<Place2>","<Place3>"],
      "vibe": ["<tag1>","<tag2>"],
      "best_season": "<short season>",
      "image_query": "<short query>"
    }
  ]
}
`.trim();
}

function takeNextCityForQuery(prefKey, list) {
  const rec = suggestCache.get(prefKey) || { list: [], idx: 0 };

  if (Array.isArray(list) && list.length) {
    const seen = new Set();
    rec.list = list.filter((x) => {
      const id = (
        x?.geocode_query ||
        `${x?.city}, ${x?.country}` ||
        ""
      ).toLowerCase();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    rec.idx = 0;
  }

  if (!rec.list.length) return null;

  const pick = rec.list[rec.idx % rec.list.length];
  rec.idx = (rec.idx + 1) % rec.list.length;
  suggestCache.set(prefKey, rec);
  return pick;
}

function extractJSON(ai) {
  function findText(obj) {
    if (!obj) return null;
    if (typeof obj === "string") return obj;
    if (typeof obj === "object") {
      for (const key of [
        "output",
        "text",
        "response",
        "message",
        "content",
        "choices",
        "data",
      ]) {
        if (obj[key]) {
          if (typeof obj[key] === "string") return obj[key];
          if (Array.isArray(obj[key]) && obj[key].length) {
            const first = obj[key][0];
            if (typeof first === "string") return first;

            if (first?.message?.content) return first.message.content;
            if (first?.text) return first.text;
            if (first?.content) return first.content;
          }
        }
      }
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === "string") return v;
        if (typeof v === "object") {
          const sub = findText(v);
          if (sub) return sub;
        }
      }
    }
    return null;
  }

  let text = findText(ai) || "";
  if (!text && ai) text = JSON.stringify(ai);

  text = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  function tryParse(s) {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch (e) {
      let norm = s.replace(/,\s*([}\]])/g, "$1"); // trailing commas
      if (norm.indexOf('"') === -1 && norm.indexOf("'") !== -1) {
        norm = norm.replace(/'/g, '"');
      }
      try {
        return JSON.parse(norm);
      } catch (e2) {
        const m = norm.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            return JSON.parse(m[0]);
          } catch (e3) {
            return null;
          }
        }
        return null;
      }
    }
  }

  let parsed = tryParse(text);
  if (parsed) {
    return parsed;
  }

  if (typeof ai === "object") {
    const keys = ["city", "country", "geocode_query", "short_reason"];
    const hasAny = keys.some((k) => ai[k]);
    if (hasAny) {
      return ai;
    }
  }
  if (typeof ai === "object") {
    for (const v of Object.values(ai)) {
      if (typeof v === "string") {
        parsed = tryParse(v);
        if (parsed) return parsed;
      }
      if (Array.isArray(v)) {
        for (const el of v) {
          if (typeof el === "string") {
            parsed = tryParse(el);
            if (parsed) return parsed;
          }
          if (typeof el === "object") {
            parsed = tryParse(JSON.stringify(el));
            if (parsed) return parsed;
          }
        }
      }
    }
  }

  console.warn("Failed to parse AI response into JSON. Raw text shown above.");
  throw new Error();
}

function validatePick(p) {
  const ok = (v) => typeof v === "string" && v.trim().length > 0;
  if (!p) return false;
  if (ok(p.geocode_query)) {
    const parts = p.geocode_query
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      if (!ok(p.country)) p.country = parts.slice(-1)[0];
      if (!ok(p.city)) p.city = parts.slice(0, -1).join(", ");
    } else if (parts.length === 1) {
      if (!ok(p.city)) p.city = parts[0];
    }
  }

  if (!ok(p.city)) return false;
  if (!ok(p.country) && !ok(p.geocode_query)) return false;

  if (!ok(p.geocode_query)) {
    p.geocode_query = ok(p.country)
      ? `${p.city.trim()}, ${p.country.trim()}`
      : p.city.trim();
  }

  return true;
}

async function geocodeCity(q) {
  const tries = [
    `https://cse2004.com/api/geocode?address=${encodeURIComponent(q)}`,
    `https://cse2004.com/api/geocode?q=${encodeURIComponent(q)}`,
    `https://cse2004.com/api/geocode?text=${encodeURIComponent(q)}`,
  ];
  let lastErr = null;
  for (const u of tries) {
    try {
      const raw = await fetchJSON(u);

      try {
        window.__lastGeocodeRaw = JSON.stringify({ url: u, raw }, null, 2);
      } catch (e) {
        window.__lastGeocodeRaw = String(raw);
      }
      const p = parseGeocode(raw);
      if (p) return p;
    } catch (e) {
      lastErr = e;
    }
  }
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&limit=1&addressdetails=1&accept-language=en`;
    window.__lastGeocodeRaw = JSON.stringify(
      { url: nomUrl, raw: null, status: "attempting_nominatim" },
      null,
      2
    );
    const nom = await fetchJSON(nomUrl);
    try {
      window.__lastGeocodeRaw = JSON.stringify(
        { url: nomUrl, raw: nom },
        null,
        2
      );
    } catch (e) {
      window.__lastGeocodeRaw = String(nom);
    }
    if (Array.isArray(nom) && nom.length) {
      const first = nom[0];
      const lat = first.lat || first.latitude;
      const lon = first.lon || first.longitude;
      if (lat && lon) return { lat: Number(lat), lng: Number(lon) };
    }
  } catch (e) {
    console.warn("nominatim fallback failed", e);
    try {
      window.__lastGeocodeRaw = JSON.stringify(
        { nominatim_error: String(e) },
        null,
        2
      );
    } catch (e2) {
      window.__lastGeocodeRaw = String(e);
    }
  }

  try {
    const openMeteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=1&language=en&format=json`;
    window.__lastGeocodeRaw = JSON.stringify(
      { url: openMeteoUrl, raw: null, status: "attempting_openmeteo" },
      null,
      2
    );
    const om = await fetchJSON(openMeteoUrl);
    try {
      window.__lastGeocodeRaw = JSON.stringify(
        { url: openMeteoUrl, raw: om },
        null,
        2
      );
    } catch (e) {
      window.__lastGeocodeRaw = String(om);
    }
    if (om && om.results && om.results.length) {
      const r = om.results[0];
      if (r.latitude != null && r.longitude != null) {
        return { lat: Number(r.latitude), lng: Number(r.longitude) };
      }
    }
  } catch (e) {
    console.warn("open-meteo fallback failed", e);
    try {
      window.__lastGeocodeRaw = JSON.stringify(
        { openmeteo_error: String(e) },
        null,
        2
      );
    } catch (e2) {
      window.__lastGeocodeRaw = String(e);
    }
  }

  throw lastErr || new Error("Geocoding failed");
}

function parseGeocode(raw) {
  if (!raw) return null;

  if (typeof raw === "object") {
    if (raw.lat || raw.latitude || raw.latitudes) {
      const lat = raw.lat ?? raw.latitude ?? raw.latitudes;
      const lng = raw.lng ?? raw.lon ?? raw.longitude ?? raw.long;
      if (lat != null && lng != null)
        return { lat: Number(lat), lng: Number(lng) };
    }

    if (Array.isArray(raw) && raw.length) {
      const first = raw[0];
      if (first.lat || first.lon || first.latitude) {
        return {
          lat: Number(first.lat ?? first.latitude),
          lng: Number(first.lon ?? first.longitude ?? first.lon),
        };
      }
    }

    if (raw.results && Array.isArray(raw.results) && raw.results.length) {
      const r = raw.results[0];
      if (
        r.geometry &&
        (r.geometry.lat || r.geometry.lng || r.geometry.coordinates)
      ) {
        const lat =
          r.geometry.lat ??
          (r.geometry.coordinates && r.geometry.coordinates[1]);
        const lng =
          r.geometry.lng ??
          (r.geometry.coordinates && r.geometry.coordinates[0]);
        if (lat != null && lng != null)
          return { lat: Number(lat), lng: Number(lng) };
      }
      // try common fields
      if (r.lat || r.lon) return { lat: Number(r.lat), lng: Number(r.lon) };
    }

    if (raw.data && typeof raw.data === "object") {
      const d = raw.data;
      if (d.lat || d.latitude)
        return {
          lat: Number(d.lat ?? d.latitude),
          lng: Number(d.lng ?? d.longitude ?? d.lon),
        };
    }
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    // look for two floats
    const floats = s.match(/-?\d+\.\d+/g);
    if (floats && floats.length >= 2) {
      return { lat: Number(floats[0]), lng: Number(floats[1]) };
    }
    // try JSON parse
    try {
      const j = JSON.parse(s);
      return parseGeocode(j);
    } catch {}
  }

  return null;
}
async function getWeather(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`;
  return fetchJSON(url);
}

function summarizeWeather(w) {
  if (!w) return { tempC: 0, humidity: 0, windKmh: 0, desc: "" };

  const cw = w.current_weather || {};
  const tempC = Math.round(Number(cw.temperature ?? 0));
  const windKmh = Math.round(Number(cw.windspeed ?? 0));

  let humidity = 0;
  if (w.hourly?.time?.length && w.hourly?.relativehumidity_2m?.length) {
    const times = w.hourly.time;
    const hums = w.hourly.relativehumidity_2m;
    const targetIso = cw.time || new Date().toISOString().slice(0, 13) + ":00";
    let idx = times.indexOf(targetIso);

    if (idx < 0) {
      const targetMs = Date.parse(targetIso);
      let best = 0,
        bestDiff = Infinity;
      for (let i = 0; i < times.length; i++) {
        const diff = Math.abs(Date.parse(times[i]) - targetMs);
        if (diff < bestDiff) {
          best = i;
          bestDiff = diff;
        }
      }
      idx = best;
    }

    humidity = Math.round(Number(hums[idx] ?? 0));
  }

  const code = Number(cw.weathercode ?? -1);
  const desc = weatherCodeToText(code);

  return { tempC, humidity, windKmh, desc };
}
function weatherCodeToText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Rain showers",
    82: "Violent rain showers",
    85: "Snow showers",
    86: "Snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with hail",
  };
  return map[code] || "";
}

/* ========= Distance (user geolocation + Haversine) ========= */
let userLoc = null;
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    },
    () => {
      userLoc = null;
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
}
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371,
    toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // km
}

/* ========= 抽屉照片轮播（Wikimedia Commons，不再盖住地图） ========= */
let photoImgs = [];
let photoIdx = 0;
const photoWrap = document.getElementById("photoWrap");
const photoImg = document.getElementById("photoImg");
const photoCount = document.getElementById("photoCount");

async function wikimediaImages(query, count = 6) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    query
  )}&gsrnamespace=6&gsrlimit=${count}&prop=imageinfo&iiprop=url&iiurlwidth=1600&format=json&origin=*`;
  try {
    const j = await fetchJSON(url);
    const pages = j?.query?.pages || {};
    return Object.values(pages)
      .map((p) => p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url)
      .filter(Boolean);
  } catch {
    return [];
  }
}
function showPhoto(i) {
  if (!photoImgs.length) return;
  photoIdx = (i + photoImgs.length) % photoImgs.length;
  photoImg.src = photoImgs[photoIdx];
  photoCount.textContent = `${photoIdx + 1} / ${photoImgs.length}`;
}
async function renderPhotos(query, seq) {
  photoImgs = await wikimediaImages(query + " skyline", 8);
  if (seq !== runSeq) return; // 已被更新的搜索取代，不再写入
  if (!photoImgs.length) {
    photoWrap.hidden = true;
    return;
  }
  photoWrap.hidden = false;
  showPhoto(0);
}
document.getElementById("photoPrev").onclick = () => showPhoto(photoIdx - 1);
document.getElementById("photoNext").onclick = () => showPhoto(photoIdx + 1);

/* 感觉词启发式："warm beach"会被地理编码误命中为美国小镇Warm Beach, WA。
   输入里带感觉词时跳过"直接飞"，走 AI/离线推荐。中文别名库不受影响。 */
const MOOD_HINTS = [
  "beach", "warm", "romantic", "aurora", "honeymoon", "snow", "mountain",
  "island", "tropical", "cozy", "relax", "chill", "sun", "sea", "sand",
  "nightlife", "foodie", "adventure", "desert", "lake", "hot spring",
  "极光", "蜜月", "雪山", "海滩", "海岛", "温暖", "浪漫", "美食",
  "夜生活", "古镇", "沙漠", "草原", "温泉", "看海", "滑雪", "潜水",
];
function looksLikeMood(q) {
  const s = (q || "").toLowerCase();
  return MOOD_HINTS.some((w) => s.includes(w.toLowerCase()));
}

/* 输入像城市名？先用 Open-Meteo 直接解析，直达那里 */
async function tryDirectCity(q) {
  if (!q || q.length > 48) return null;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=1&language=en&format=json`;
    const j = await fetchJSON(url);
    const r = j?.results?.[0];
    if (!r || r.latitude == null || r.longitude == null) return null;
    return {
      name: r.name,
      country: r.country || "",
      lat: Number(r.latitude),
      lng: Number(r.longitude),
    };
  } catch {
    return null;
  }
}

/* 直接命中的城市：如果本地库里有它，就补上景点/季节/氛围信息 */
function buildDirectPick(d) {
  const local = typeof findCityByName === "function" ? findCityByName(d.name) : null;
  const country = d.country || local?.country || "";
  return {
    city: d.name,
    country,
    geocode_query: country ? `${d.name}, ${country}` : d.name,
    short_reason: local?.short_reason || "",
    must_see: local?.must_see || [],
    vibe: local?.vibe || [],
    best_season: local?.best_season || "—",
    image_query: d.name,
    _latlng: { lat: d.lat, lng: d.lng },
  };
}

let runSeq = 0; // 搜索序号：防止快速连搜时慢请求覆盖新结果
async function run() {
  const mySeq = ++runSeq;
  const q = elPref.value.trim();
  if (!q) {
    showErr("输入一个城市名，或描述一种你想要的感觉。");
    return;
  }

  // UI reset
  showErr();
  drawer.classList.remove("open");

  try {
    let pick = null;
    let offline = false;

    // 1) 像城市名？直接飞过去（不走推荐）。带感觉词的输入跳过这步。
    const direct = looksLikeMood(q) ? null : await tryDirectCity(q);
    if (direct) {
      pick = buildDirectPick(direct);
    } else if (typeof findCityByAlias === "function" && findCityByAlias(q)) {
      // 2) 中文别名 / 本地库精确命中（比如"巴黎"）
      pick = findCityByAlias(q);
      offline = true;
    } else {
      // 3) 否则当成"感觉"：AI 推荐，失败则本地库兜底
      const key = normKey(q);
      const prev = suggestCache.get(key);
      const exclude = prev?.list
        ? prev.list
            .map((x) =>
              (x?.geocode_query || `${x?.city}, ${x?.country}` || "").trim()
            )
            .filter(Boolean)
        : [];

      let list = [];
      if (getApiKey()) {
        try {
          const aiRaw = await askAI(buildPrompt(q, exclude));
          const parsed = extractJSON(aiRaw);
          if (parsed?.cities && Array.isArray(parsed.cities)) {
            list = parsed.cities;
          } else if (parsed && typeof parsed === "object") {
            list = [parsed];
          }
          list = list.filter(validatePick);
        } catch (e) {
          console.warn("AI 推荐失败，切换本地离线推荐：", e);
        }
      }
      if (!list.length) {
        offline = true;
        list = localRecommend(q, exclude).filter(validatePick);
      }
      if (!list.length) {
        throw new Error("没有匹配到城市，换个关键词试试吧。");
      }
      pick = takeNextCityForQuery(key, list);
    }

    if (!pick || !validatePick(pick)) {
      throw new Error("没有匹配到城市，换个关键词试试吧。");
    }

    // 轻提示（离线模式会标注出来）
    try {
      showResult(
        (offline ? "（离线推荐）" : "") +
          (pick.city || pick.geocode_query || "(no city returned)")
      );
    } catch {}

    // 地理编码（直接命中的城市已自带坐标）
    const g = pick._latlng || (await geocodeCity(pick.geocode_query));
    const w = await getWeather(g.lat, g.lng);
    if (mySeq !== runSeq) return; // 已被更新的搜索取代
    const wx = summarizeWeather(w);

    // DOM 注入
    document.getElementById("weatherNow").textContent = wx.desc || "—";
    document.getElementById("tempNow").textContent = `${wx.tempC}°C`;
    document.getElementById("humidityNow").textContent = `${wx.humidity}%`;
    document.getElementById("windNow").textContent = `${wx.windKmh} km/h`;

    document.getElementById("bestSeason").textContent = pick.best_season || "—";
    document.getElementById("vibe").textContent =
      (pick.vibe || []).join(" • ") || "—";

    // 地图：飞过去 + 脉冲标记
    flyToCity(
      g.lat,
      g.lng,
      `<b>${pick.city}</b>${pick.country ? ", " + pick.country : ""}`
    );

    // 标题与景点
    cityTitle.textContent = pick.country
      ? `${pick.city}, ${pick.country}`
      : pick.city;
    sights.innerHTML =
      (pick.must_see || []).map((s) => `<li>${s}</li>`).join("") ||
      "<li>在地图上探索这座城市吧 🗺️</li>";

    // 距离
    if (userLoc) {
      const km = haversine(userLoc.lat, userLoc.lng, g.lat, g.lng);
      distance.textContent = `${km.toFixed(0)} km from your location`;
    } else {
      distance.textContent = "Location permission not granted";
    }

    // 照片轮播（不阻塞抽屉打开）
    renderPhotos(pick.image_query || `${pick.city} skyline`, mySeq);

    drawer.classList.add("open");
  } catch (e) {
    if (mySeq !== runSeq) return; // 已被更新的搜索取代，不报错
    console.error("[AI/Geo/Weather error]", e);
    showErr(e.message || "Something went wrong.");
  }
}

function showErr(msg) {
  if (!msg) {
    elErr.hidden = true;
    elErr.textContent = "";
    return;
  }
  elErr.hidden = false;
  elErr.textContent = msg;
}

// lightweight result indicator: shows a small banner with the provided text
function showResult(text, timeout = 3500) {
  let el = document.getElementById("__result_banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "__result_banner";
    el.className = "result-banner";
    el.style.display = "none";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(el.__t);
  el.__t = setTimeout(() => (el.style.display = "none"), timeout);
}
