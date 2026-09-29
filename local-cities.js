/* ========= 本地城市库：AI 不可用时的离线兜底推荐 =========
   每个城市带 tags（英文关键词），localRecommend() 按关键词匹配打分。
   ZH_KEYWORDS 把常见中文词映射到英文 tag，方便中文输入。 */

const LOCAL_CITIES = [
  { city: "Kyoto", country: "Japan", geocode_query: "Kyoto, Japan",
    short_reason: "Ancient temples, quiet gardens and breathtaking autumn colors.",
    must_see: ["Fushimi Inari Shrine", "Arashiyama Bamboo Grove", "Kinkaku-ji"],
    vibe: ["historic", "serene"], best_season: "Mar–May, Oct–Nov", image_query: "Kyoto",
    tags: ["historic", "culture", "temple", "serene", "traditional", "autumn", "asia", "romantic", "garden"],
    aliases: ['京都'] },
  { city: "Paris", country: "France", geocode_query: "Paris, France",
    short_reason: "The classic romantic getaway — art, cafés and the Eiffel Tower.",
    must_see: ["Eiffel Tower", "Louvre Museum", "Montmartre"],
    vibe: ["romantic", "artistic"], best_season: "Apr–Jun, Sep–Oct", image_query: "Paris",
    tags: ["romantic", "art", "city", "food", "museum", "europe", "honeymoon", "fashion"],
    aliases: ['巴黎'] },
  { city: "Santorini", country: "Greece", geocode_query: "Santorini, Greece",
    short_reason: "Whitewashed villages over a blue caldera — made for sunsets.",
    must_see: ["Oia sunset", "Red Beach", "Ancient Thira"],
    vibe: ["romantic", "island"], best_season: "May–Oct", image_query: "Santorini",
    tags: ["romantic", "beach", "island", "sunset", "honeymoon", "europe", "sea"],
    aliases: ['圣托里尼'] },
  { city: "Bali", country: "Indonesia", geocode_query: "Bali, Indonesia",
    short_reason: "Tropical beaches, temples and jungle swings on a budget.",
    must_see: ["Uluwatu Temple", "Tegalalang Rice Terrace", "Nusa Penida"],
    vibe: ["tropical", "exotic"], best_season: "Apr–Oct", image_query: "Bali",
    tags: ["beach", "tropical", "island", "exotic", "budget", "temple", "surf", "asia", "sea"],
    aliases: ['巴厘岛', '巴厘'] },
  { city: "Rome", country: "Italy", geocode_query: "Rome, Italy",
    short_reason: "Two thousand years of history plus some of the world's best food.",
    must_see: ["Colosseum", "Vatican Museums", "Trastevere"],
    vibe: ["historic", "foodie"], best_season: "Apr–Jun, Sep–Oct", image_query: "Rome",
    tags: ["historic", "culture", "food", "city", "europe", "ancient", "museum"],
    aliases: ['罗马'] },
  { city: "Barcelona", country: "Spain", geocode_query: "Barcelona, Spain",
    short_reason: "Gaudí architecture, tapas and a city beach in one trip.",
    must_see: ["Sagrada Família", "Park Güell", "Barceloneta Beach"],
    vibe: ["artistic", "lively"], best_season: "May–Sep", image_query: "Barcelona",
    tags: ["beach", "art", "food", "city", "europe", "architecture", "nightlife", "sea"],
    aliases: ['巴塞罗那', '巴塞隆纳'] },
  { city: "Tokyo", country: "Japan", geocode_query: "Tokyo, Japan",
    short_reason: "Neon streets, Michelin food and pop culture at full speed.",
    must_see: ["Shibuya Crossing", "Senso-ji Temple", "Shinjuku"],
    vibe: ["modern", "foodie"], best_season: "Mar–May, Oct–Nov", image_query: "Tokyo",
    tags: ["modern", "city", "food", "asia", "shopping", "nightlife", "technology"],
    aliases: ['东京'] },
  { city: "Bangkok", country: "Thailand", geocode_query: "Bangkok, Thailand",
    short_reason: "Street food heaven with temples, markets and rooftop nights.",
    must_see: ["Grand Palace", "Chatuchak Market", "Chao Phraya River"],
    vibe: ["exotic", "lively"], best_season: "Nov–Feb", image_query: "Bangkok",
    tags: ["warm", "food", "exotic", "city", "asia", "budget", "nightlife", "temple", "shopping"],
    aliases: ['曼谷'] },
  { city: "Dubai", country: "United Arab Emirates", geocode_query: "Dubai, United Arab Emirates",
    short_reason: "Desert luxury — skyscrapers, souks and year-round sunshine.",
    must_see: ["Burj Khalifa", "Dubai Mall", "Desert safari"],
    vibe: ["luxury", "modern"], best_season: "Nov–Mar", image_query: "Dubai",
    tags: ["warm", "luxury", "modern", "desert", "shopping", "city", "sun"],
    aliases: ['迪拜'] },
  { city: "Maldives", country: "Maldives", geocode_query: "Maldives",
    short_reason: "Overwater villas on the clearest water on Earth.",
    must_see: ["Sandbank picnic", "Manta ray diving", "Sunset dolphin cruise"],
    vibe: ["luxury", "island"], best_season: "Nov–Apr", image_query: "Maldives",
    tags: ["beach", "luxury", "island", "honeymoon", "romantic", "diving", "sea", "sun"],
    aliases: ['马尔代夫'] },
  { city: "Venice", country: "Italy", geocode_query: "Venice, Italy",
    short_reason: "Canals, gondolas and quiet corners made for two.",
    must_see: ["St. Mark's Basilica", "Grand Canal", "Burano"],
    vibe: ["romantic", "historic"], best_season: "Apr–Jun, Sep–Oct", image_query: "Venice",
    tags: ["romantic", "historic", "europe", "honeymoon", "culture", "canal"],
    aliases: ['威尼斯'] },
  { city: "Prague", country: "Czechia", geocode_query: "Prague, Czechia",
    short_reason: "A fairy-tale old town that won't break the bank.",
    must_see: ["Charles Bridge", "Prague Castle", "Old Town Square"],
    vibe: ["romantic", "historic"], best_season: "Apr–Jun, Sep–Oct", image_query: "Prague",
    tags: ["romantic", "historic", "europe", "budget", "castle", "culture"],
    aliases: ['布拉格'] },
  { city: "Marrakech", country: "Morocco", geocode_query: "Marrakech, Morocco",
    short_reason: "Spice markets, riads and the gateway to the Sahara.",
    must_see: ["Jemaa el-Fnaa", "Jardin Majorelle", "Agafay Desert"],
    vibe: ["exotic", "desert"], best_season: "Mar–May, Sep–Nov", image_query: "Marrakech",
    tags: ["exotic", "desert", "historic", "culture", "budget", "africa", "market"],
    aliases: ['马拉喀什'] },
  { city: "Istanbul", country: "Turkey", geocode_query: "Istanbul, Turkey",
    short_reason: "Where Europe meets Asia — bazaars, mosques and baklava.",
    must_see: ["Hagia Sophia", "Grand Bazaar", "Bosphorus cruise"],
    vibe: ["exotic", "historic"], best_season: "Apr–Jun, Sep–Nov", image_query: "Istanbul",
    tags: ["exotic", "historic", "food", "culture", "asia", "europe", "market"],
    aliases: ['伊斯坦布尔'] },
  { city: "Cairo", country: "Egypt", geocode_query: "Cairo, Egypt",
    short_reason: "The pyramids — the oldest wonder you can still walk around.",
    must_see: ["Pyramids of Giza", "Egyptian Museum", "Khan el-Khalili"],
    vibe: ["historic", "exotic"], best_season: "Oct–Apr", image_query: "Cairo pyramids",
    tags: ["historic", "desert", "exotic", "ancient", "africa", "budget", "culture"],
    aliases: ['开罗'] },
  { city: "Reykjavik", country: "Iceland", geocode_query: "Reykjavik, Iceland",
    short_reason: "Northern lights, waterfalls and black-sand beaches.",
    must_see: ["Northern lights tour", "Golden Circle", "Blue Lagoon"],
    vibe: ["adventurous", "natural"], best_season: "Sep–Mar for aurora", image_query: "Reykjavik northern lights",
    tags: ["nature", "snow", "aurora", "adventure", "waterfall", "europe", "unique"],
    aliases: ['雷克雅未克'] },
  { city: "Banff", country: "Canada", geocode_query: "Banff, Canada",
    short_reason: "Turquoise lakes under the Rockies — postcard Canada.",
    must_see: ["Lake Louise", "Moraine Lake", "Banff Gondola"],
    vibe: ["natural", "mountain"], best_season: "Jun–Sep, Dec–Mar", image_query: "Banff",
    tags: ["nature", "mountain", "lake", "snow", "hiking", "adventure", "green"],
    aliases: ['班夫'] },
  { city: "Interlaken", country: "Switzerland", geocode_query: "Interlaken, Switzerland",
    short_reason: "Alpine adventure capital between two lakes.",
    must_see: ["Jungfraujoch", "Lake Thun", "Paragliding"],
    vibe: ["adventurous", "mountain"], best_season: "Jun–Sep, Dec–Mar", image_query: "Interlaken",
    tags: ["mountain", "nature", "adventure", "snow", "lake", "europe", "hiking", "green"],
    aliases: ['因特拉肯'] },
  { city: "Queenstown", country: "New Zealand", geocode_query: "Queenstown, New Zealand",
    short_reason: "Bungee jumping, fjords and Middle-earth scenery.",
    must_see: ["Milford Sound", "Bungee jumping", "Lake Wakatipu"],
    vibe: ["adventurous", "natural"], best_season: "Dec–Feb, Jun–Aug", image_query: "Queenstown",
    tags: ["adventure", "nature", "mountain", "lake", "oceania", "hiking", "green"],
    aliases: ['皇后镇'] },
  { city: "Cape Town", country: "South Africa", geocode_query: "Cape Town, South Africa",
    short_reason: "Table Mountain, penguins and world-class wine country.",
    must_see: ["Table Mountain", "Boulders Beach", "Stellenbosch"],
    vibe: ["natural", "city"], best_season: "Nov–Mar", image_query: "Cape Town",
    tags: ["nature", "beach", "city", "africa", "wine", "mountain", "sea"],
    aliases: ['开普敦'] },
  { city: "Sydney", country: "Australia", geocode_query: "Sydney, Australia",
    short_reason: "Harbour icons plus surf beaches in one sunny city.",
    must_see: ["Sydney Opera House", "Bondi Beach", "Harbour Bridge"],
    vibe: ["city", "beach"], best_season: "Oct–Apr", image_query: "Sydney",
    tags: ["beach", "city", "oceania", "surf", "sun", "sea", "modern"],
    aliases: ['悉尼'] },
  { city: "Singapore", country: "Singapore", geocode_query: "Singapore",
    short_reason: "Futuristic gardens and legendary hawker food.",
    must_see: ["Marina Bay Sands", "Gardens by the Bay", "Chinatown"],
    vibe: ["modern", "foodie"], best_season: "Year-round", image_query: "Singapore",
    tags: ["modern", "food", "city", "asia", "tropical", "shopping", "garden"],
    aliases: ['新加坡'] },
  { city: "Seoul", country: "South Korea", geocode_query: "Seoul, South Korea",
    short_reason: "K-culture, palaces and late-night food streets.",
    must_see: ["Gyeongbokgung Palace", "Myeongdong", "Bukchon Hanok Village"],
    vibe: ["modern", "lively"], best_season: "Apr–Jun, Sep–Nov", image_query: "Seoul",
    tags: ["modern", "city", "food", "asia", "shopping", "culture", "nightlife"],
    aliases: ['首尔'] },
  { city: "New York", country: "United States", geocode_query: "New York, United States",
    short_reason: "The city that has everything, all at once.",
    must_see: ["Central Park", "Times Square", "The Met"],
    vibe: ["city", "artistic"], best_season: "Apr–Jun, Sep–Nov", image_query: "New York",
    tags: ["city", "modern", "art", "museum", "shopping", "food", "nightlife", "america"],
    aliases: ['纽约'] },
  { city: "Tulum", country: "Mexico", geocode_query: "Tulum, Mexico",
    short_reason: "Mayan ruins on cliffs above Caribbean water.",
    must_see: ["Tulum Ruins", "Gran Cenote", "Playa Paraíso"],
    vibe: ["beach", "boho"], best_season: "Nov–Apr", image_query: "Tulum",
    tags: ["beach", "historic", "sea", "america", "budget", "diving", "sun", "ruins"],
    aliases: ['图卢姆'] },
  { city: "Cancun", country: "Mexico", geocode_query: "Cancun, Mexico",
    short_reason: "Warm water, white sand and easy all-inclusive vibes.",
    must_see: ["Isla Mujeres", "Chichen Itza day trip", "Playa Delfines"],
    vibe: ["beach", "warm"], best_season: "Nov–Apr", image_query: "Cancun",
    tags: ["beach", "warm", "sea", "america", "sun", "budget"],
    aliases: ['坎昆'] },
  { city: "Phuket", country: "Thailand", geocode_query: "Phuket, Thailand",
    short_reason: "Island-hopping, limestone cliffs and night markets.",
    must_see: ["Phi Phi Islands", "Big Buddha", "Patong Beach"],
    vibe: ["tropical", "island"], best_season: "Nov–Apr", image_query: "Phuket",
    tags: ["beach", "island", "tropical", "asia", "budget", "sea", "warm", "diving"],
    aliases: ['普吉岛', '普吉'] },
  { city: "Havana", country: "Cuba", geocode_query: "Havana, Cuba",
    short_reason: "Classic cars, salsa and time-capsule streets.",
    must_see: ["Malecón", "Old Havana", "Buena Vista-style live music"],
    vibe: ["exotic", "historic"], best_season: "Nov–Apr", image_query: "Havana",
    tags: ["exotic", "historic", "music", "america", "budget", "culture", "city"],
    aliases: ['哈瓦那'] },
  { city: "Athens", country: "Greece", geocode_query: "Athens, Greece",
    short_reason: "The Acropolis plus easy island day trips.",
    must_see: ["Acropolis", "Plaka", "Aegina day trip"],
    vibe: ["historic", "island"], best_season: "Apr–Jun, Sep–Oct", image_query: "Athens",
    tags: ["historic", "europe", "ancient", "island", "food", "sea", "culture"],
    aliases: ['雅典'] },
  { city: "Amalfi", country: "Italy", geocode_query: "Amalfi, Italy",
    short_reason: "Cliffside villages and lemon groves over the sea.",
    must_see: ["Positano", "Ravello", "Boat day trip"],
    vibe: ["romantic", "coastal"], best_season: "May–Sep", image_query: "Amalfi",
    tags: ["romantic", "beach", "sea", "europe", "scenic", "honeymoon", "coast"],
    aliases: ['阿马尔菲'] },
];

/* 中文关键词 → 英文 tag 映射 */
const ZH_KEYWORDS = {
  "海滩": "beach", "海岛": "island", "海": "sea", "沙滩": "beach",
  "浪漫": "romantic", "蜜月": "honeymoon", "情侣": "romantic",
  "暖": "warm", "温暖": "warm", "热": "warm", "阳光": "sun",
  "自然": "nature", "绿色": "green", "绿": "green",
  "历史": "historic", "古": "historic", "古迹": "historic", "遗迹": "ruins",
  "美食": "food", "吃": "food", "小吃": "food",
  "购物": "shopping", "城市": "city", "现代": "modern",
  "雪": "snow", "滑雪": "snow", "山": "mountain", "湖": "lake",
  "沙漠": "desert", "异域": "exotic", "便宜": "budget", "省钱": "budget",
  "奢华": "luxury", "潜水": "diving", "冲浪": "surf",
  "极光": "aurora", "寺庙": "temple", "夜生活": "nightlife",
  "冒险": "adventure", "刺激": "adventure", "艺术": "art", "博物馆": "museum",
  "岛": "island", "酒": "wine", "徒步": "hiking", "爬山": "hiking",
};

function localRecommend(query, exclude = []) {
  const excluded = new Set(
    exclude.map((s) => (s || "").trim().toLowerCase()).filter(Boolean)
  );
  // 中文词先映射成英文 tag
  let q = (query || "").toLowerCase();
  for (const [zh, en] of Object.entries(ZH_KEYWORDS)) {
    if (q.includes(zh)) q += " " + en;
  }
  const tokens = q.split(/[^a-z\u4e00-\u9fa5]+/).filter((t) => t.length > 1);

  const scored = LOCAL_CITIES.filter(
    (c) => !excluded.has((c.geocode_query || "").toLowerCase())
  ).map((c) => {
    const hayTags = c.tags.join(" ") + " " + c.vibe.join(" ");
    const hayText = (
      c.city + " " + c.country + " " + c.short_reason
    ).toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hayTags.includes(t)) score += 2;
      else if (hayText.includes(t)) score += 1;
    }
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  let picks = scored.filter((s) => s.score > 0).map((s) => s.c);
  if (!picks.length) {
    // 没有关键词命中：给一个多样化的默认组合
    const defaults = ["Kyoto", "Paris", "Bali", "Reykjavik", "Marrakech", "Barcelona", "Banff", "Cape Town"];
    picks = defaults
      .map((name) => LOCAL_CITIES.find((c) => c.city === name))
      .filter((c) => c && !excluded.has(c.geocode_query.toLowerCase()));
  }
  return picks.slice(0, 8);
}

/* 按英文名或中文别名精确查找城市（直接输入城市名时用） */
function findCityByName(name) {
  const n = (name || "").trim().toLowerCase();
  if (!n) return null;
  return LOCAL_CITIES.find((c) => c.city.toLowerCase() === n) || null;
}
function findCityByAlias(q) {
  const n = (q || "").trim().toLowerCase();
  if (!n) return null;
  return (
    LOCAL_CITIES.find(
      (c) =>
        c.city.toLowerCase() === n ||
        (c.aliases || []).some((a) => a.toLowerCase() === n)
    ) || null
  );
}
