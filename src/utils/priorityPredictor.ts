// Priority prediction helpers based on keywords and complaint details

export const HIGH_KEYWORDS = [
  "dangerous", "hazard", "emergency", "critical", "flood", "collapse", "fire",
  "accident", "injury", "broken pipe", "sewage overflow", "electrocution",
  "fallen tree", "contaminated", "no water", "power outage",
];

export const MEDIUM_KEYWORDS = [
  "pothole", "leak", "damage", "overflowing", "blockage", "broken",
  "not working", "missing", "stray animal", "garbage", "noise",
  "complaint", "dirty", "issue", "problem",
];

export const PROBLEM_TYPES: Record<string, string[]> = {
  "water supply": [
    "No water supply", "Low water pressure", "Dirty / contaminated water",
    "Pipe leakage", "Broken water meter", "Water logging on road",
  ],
  "roads & potholes": [
    "Pothole on road", "Damaged footpath", "Road cave-in",
    "Missing road sign", "Encroachment on road", "Flooding on road",
  ],
  "garbage & sanitation": [
    "Uncollected garbage", "Overflowing dustbin", "Illegal dumping",
    "Dead animal disposal", "Public toilet issue", "Street cleaning needed",
  ],
  "streetlights": [
    "Streetlight not working", "Flickering light", "Damaged pole",
    "New streetlight needed", "Light burning in daytime",
  ],
  "parks & public property": [
    "Broken bench / equipment", "Overgrown vegetation",
    "Encroachment in park", "Damaged playground", "Lighting in park not working",
  ],
  "drainage & sewage": [
    "Blocked drain", "Sewage overflow", "Foul smell from drain",
    "Manhole without cover", "Waterlogging",
  ],
  "noise & pollution": [
    "Construction noise", "Commercial noise", "Air pollution",
    "Industrial effluent", "Burning waste",
  ],
  "animals & pests": [
    "Stray dogs / cats", "Pest infestation", "Animal carcass", "Mosquito breeding",
  ],
};

export function predictPriority(title: string, description: string, problemType: string): string {
  const text = `${title} ${description} ${problemType}`.toLowerCase();
  if (HIGH_KEYWORDS.some(k => text.includes(k))) return "high";
  if (MEDIUM_KEYWORDS.some(k => text.includes(k))) return "medium";
  if (text.trim().length > 20) return "medium";
  return "low";
}
