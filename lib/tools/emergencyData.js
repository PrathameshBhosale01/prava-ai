// Emergency numbers by country. Plain data, no imports, so it is safe to use
// in client components and in node tests.
//
// kind: "universal" | "police" | "fire" | "ambulance" | "tourist" | "helpline"
// `universal` is a single number that reaches every service (112, 911, 000...).
// Numbers are compiled from public sources and DO change: keep this file the
// single place to update them.

export const REGIONS = [
  "Asia",
  "Europe",
  "Middle East",
  "Africa",
  "North America",
  "South America",
  "Oceania",
];

const n = (kind, label, number, note) => ({ kind, label, number, ...(note && { note }) });

export const EMERGENCY_COUNTRIES = [
  // ---------------------------------------------------------------- Asia
  {
    code: "IN", name: "India", region: "Asia", aliases: ["Bharat"],
    numbers: [
      n("universal", "All emergencies", "112"),
      n("police", "Police", "100"),
      n("fire", "Fire", "101"),
      n("ambulance", "Ambulance", "102", "108 also works in many states"),
      n("helpline", "Women helpline", "1091"),
      n("tourist", "Tourist helpline", "1363", "Multilingual, run by the Ministry of Tourism"),
    ],
  },
  {
    code: "JP", name: "Japan", region: "Asia", aliases: ["Nippon"],
    numbers: [
      n("police", "Police", "110"),
      n("fire", "Fire", "119"),
      n("ambulance", "Ambulance", "119"),
      n("tourist", "Visitor hotline", "050-3816-2787", "24/7, English, Chinese, Korean"),
    ],
  },
  {
    code: "CN", name: "China", region: "Asia", aliases: ["PRC"],
    numbers: [
      n("police", "Police", "110"),
      n("fire", "Fire", "119"),
      n("ambulance", "Ambulance", "120"),
      n("police", "Traffic accidents", "122"),
    ],
  },
  {
    code: "HK", name: "Hong Kong", region: "Asia", aliases: [],
    numbers: [n("universal", "All emergencies", "999")],
  },
  {
    code: "KR", name: "South Korea", region: "Asia", aliases: ["Korea", "Republic of Korea"],
    numbers: [
      n("police", "Police", "112"),
      n("fire", "Fire", "119"),
      n("ambulance", "Ambulance", "119"),
      n("tourist", "Tourist hotline", "1330", "24/7 multilingual"),
    ],
  },
  {
    code: "SG", name: "Singapore", region: "Asia", aliases: [],
    numbers: [
      n("police", "Police", "999"),
      n("fire", "Fire", "995"),
      n("ambulance", "Ambulance", "995"),
    ],
  },
  {
    code: "TH", name: "Thailand", region: "Asia", aliases: ["Siam"],
    numbers: [
      n("police", "Police", "191"),
      n("fire", "Fire", "199"),
      n("ambulance", "Ambulance", "1669"),
      n("tourist", "Tourist police", "1155", "English-speaking officers"),
    ],
  },
  {
    code: "ID", name: "Indonesia", region: "Asia", aliases: ["Bali"],
    numbers: [
      n("police", "Police", "110"),
      n("fire", "Fire", "113"),
      n("ambulance", "Ambulance", "118", "119 also works"),
    ],
  },
  {
    code: "MY", name: "Malaysia", region: "Asia", aliases: [],
    numbers: [
      n("universal", "Police, fire, ambulance", "999"),
      n("universal", "From a mobile phone", "112"),
    ],
  },
  {
    code: "VN", name: "Vietnam", region: "Asia", aliases: ["Viet Nam"],
    numbers: [
      n("police", "Police", "113"),
      n("fire", "Fire", "114"),
      n("ambulance", "Ambulance", "115"),
    ],
  },
  {
    code: "PH", name: "Philippines", region: "Asia", aliases: [],
    numbers: [n("universal", "All emergencies", "911")],
  },
  {
    code: "LK", name: "Sri Lanka", region: "Asia", aliases: ["Ceylon"],
    numbers: [
      n("police", "Police", "119"),
      n("fire", "Fire and rescue", "110"),
      n("ambulance", "Ambulance", "1990"),
      n("tourist", "Tourist police", "1912"),
    ],
  },
  {
    code: "NP", name: "Nepal", region: "Asia", aliases: [],
    numbers: [
      n("police", "Police", "100"),
      n("fire", "Fire", "101"),
      n("ambulance", "Ambulance", "102"),
      n("tourist", "Tourist police", "1144"),
    ],
  },

  // -------------------------------------------------------------- Europe
  {
    code: "GB", name: "United Kingdom", region: "Europe", aliases: ["UK", "Britain", "England", "Scotland", "Wales"],
    numbers: [
      n("universal", "All emergencies", "999"),
      n("universal", "Also works", "112"),
    ],
  },
  {
    code: "IE", name: "Ireland", region: "Europe", aliases: [],
    numbers: [
      n("universal", "All emergencies", "112"),
      n("universal", "Also works", "999"),
    ],
  },
  {
    code: "FR", name: "France", region: "Europe", aliases: ["Paris"],
    numbers: [
      n("universal", "All emergencies (EU)", "112"),
      n("police", "Police", "17"),
      n("fire", "Fire", "18"),
      n("ambulance", "Ambulance (SAMU)", "15"),
    ],
  },
  {
    code: "DE", name: "Germany", region: "Europe", aliases: ["Deutschland"],
    numbers: [
      n("universal", "Fire and ambulance (EU)", "112"),
      n("police", "Police", "110"),
    ],
  },
  {
    code: "IT", name: "Italy", region: "Europe", aliases: ["Italia"],
    numbers: [
      n("universal", "All emergencies (EU)", "112"),
      n("police", "Police", "113"),
      n("fire", "Fire", "115"),
      n("ambulance", "Ambulance", "118"),
    ],
  },
  {
    code: "ES", name: "Spain", region: "Europe", aliases: ["Espana"],
    numbers: [
      n("universal", "All emergencies (EU)", "112"),
      n("police", "National police", "091"),
      n("ambulance", "Ambulance", "061", "Varies by region, 112 always works"),
    ],
  },
  {
    code: "PT", name: "Portugal", region: "Europe", aliases: [],
    numbers: [n("universal", "All emergencies (EU)", "112")],
  },
  {
    code: "NL", name: "Netherlands", region: "Europe", aliases: ["Holland"],
    numbers: [n("universal", "All emergencies (EU)", "112")],
  },
  {
    code: "CH", name: "Switzerland", region: "Europe", aliases: ["Swiss"],
    numbers: [
      n("universal", "All emergencies", "112"),
      n("police", "Police", "117"),
      n("fire", "Fire", "118"),
      n("ambulance", "Ambulance", "144"),
    ],
  },
  {
    code: "SE", name: "Sweden", region: "Europe", aliases: [],
    numbers: [n("universal", "All emergencies (EU)", "112")],
  },
  {
    code: "GR", name: "Greece", region: "Europe", aliases: ["Hellas"],
    numbers: [
      n("universal", "All emergencies (EU)", "112"),
      n("police", "Police", "100"),
      n("fire", "Fire", "199"),
      n("ambulance", "Ambulance", "166"),
      n("tourist", "Tourist police", "1571"),
    ],
  },
  {
    code: "PL", name: "Poland", region: "Europe", aliases: ["Polska"],
    numbers: [
      n("universal", "All emergencies (EU)", "112"),
      n("police", "Police", "997"),
      n("fire", "Fire", "998"),
      n("ambulance", "Ambulance", "999"),
    ],
  },
  {
    code: "RU", name: "Russia", region: "Europe", aliases: [],
    numbers: [
      n("universal", "All emergencies", "112"),
      n("police", "Police", "102"),
      n("fire", "Fire", "101"),
      n("ambulance", "Ambulance", "103"),
    ],
  },

  // --------------------------------------------------------- Middle East
  {
    code: "AE", name: "United Arab Emirates", region: "Middle East", aliases: ["UAE", "Dubai", "Abu Dhabi"],
    numbers: [
      n("police", "Police", "999"),
      n("fire", "Fire", "997"),
      n("ambulance", "Ambulance", "998"),
      n("police", "Dubai Police (non-emergency)", "901"),
    ],
  },
  {
    code: "TR", name: "Turkey", region: "Middle East", aliases: ["Turkiye"],
    numbers: [
      n("universal", "All emergencies", "112"),
      n("police", "Police", "155"),
      n("fire", "Fire", "110"),
    ],
  },

  // -------------------------------------------------------------- Africa
  {
    code: "ZA", name: "South Africa", region: "Africa", aliases: [],
    numbers: [
      n("universal", "From a mobile phone", "112"),
      n("police", "Police", "10111"),
      n("ambulance", "Ambulance and fire", "10177"),
    ],
  },
  {
    code: "EG", name: "Egypt", region: "Africa", aliases: [],
    numbers: [
      n("police", "Police", "122"),
      n("fire", "Fire", "180"),
      n("ambulance", "Ambulance", "123"),
      n("tourist", "Tourist police", "126"),
    ],
  },

  // ------------------------------------------------------ North America
  {
    code: "US", name: "United States", region: "North America", aliases: ["USA", "America", "US"],
    numbers: [n("universal", "All emergencies", "911")],
  },
  {
    code: "CA", name: "Canada", region: "North America", aliases: [],
    numbers: [n("universal", "All emergencies", "911")],
  },
  {
    code: "MX", name: "Mexico", region: "North America", aliases: [],
    numbers: [
      n("universal", "All emergencies", "911"),
      n("tourist", "Tourist assistance", "078"),
    ],
  },

  // ------------------------------------------------------ South America
  {
    code: "BR", name: "Brazil", region: "South America", aliases: ["Brasil"],
    numbers: [
      n("police", "Police", "190"),
      n("fire", "Fire", "193"),
      n("ambulance", "Ambulance", "192"),
    ],
  },

  // ------------------------------------------------------------- Oceania
  {
    code: "AU", name: "Australia", region: "Oceania", aliases: [],
    numbers: [
      n("universal", "All emergencies", "000"),
      n("universal", "From a mobile phone", "112"),
    ],
  },
  {
    code: "NZ", name: "New Zealand", region: "Oceania", aliases: ["NZ", "Aotearoa"],
    numbers: [n("universal", "All emergencies", "111")],
  },
];
