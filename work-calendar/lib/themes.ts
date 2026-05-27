export interface Theme {
  id: string;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryText: string;
}

export const THEMES: Theme[] = [
  { id: "blue",    name: "น้ำเงิน",       primary: "#3B82F6", primaryDark: "#2563EB", primaryLight: "#EFF6FF", primaryText: "#1D4ED8" },
  { id: "indigo",  name: "คราม",          primary: "#6366F1", primaryDark: "#4F46E5", primaryLight: "#EEF2FF", primaryText: "#4338CA" },
  { id: "purple",  name: "ม่วง",          primary: "#8B5CF6", primaryDark: "#7C3AED", primaryLight: "#F5F3FF", primaryText: "#6D28D9" },
  { id: "violet",  name: "ไวโอเลต",       primary: "#7C3AED", primaryDark: "#6D28D9", primaryLight: "#F5F3FF", primaryText: "#5B21B6" },
  { id: "pink",    name: "ชมพู",          primary: "#EC4899", primaryDark: "#DB2777", primaryLight: "#FDF2F8", primaryText: "#BE185D" },
  { id: "rose",    name: "กุหลาบ",        primary: "#F43F5E", primaryDark: "#E11D48", primaryLight: "#FFF1F2", primaryText: "#BE123C" },
  { id: "red",     name: "แดง",           primary: "#EF4444", primaryDark: "#DC2626", primaryLight: "#FEF2F2", primaryText: "#B91C1C" },
  { id: "orange",  name: "ส้ม",           primary: "#F97316", primaryDark: "#EA580C", primaryLight: "#FFF7ED", primaryText: "#C2410C" },
  { id: "amber",   name: "เหลืองทอง",    primary: "#F59E0B", primaryDark: "#D97706", primaryLight: "#FFFBEB", primaryText: "#B45309" },
  { id: "yellow",  name: "เหลือง",        primary: "#EAB308", primaryDark: "#CA8A04", primaryLight: "#FEFCE8", primaryText: "#A16207" },
  { id: "lime",    name: "เขียวมะนาว",   primary: "#84CC16", primaryDark: "#65A30D", primaryLight: "#F7FEE7", primaryText: "#4D7C0F" },
  { id: "green",   name: "เขียว",         primary: "#22C55E", primaryDark: "#16A34A", primaryLight: "#F0FDF4", primaryText: "#15803D" },
  { id: "emerald", name: "มรกต",          primary: "#10B981", primaryDark: "#059669", primaryLight: "#ECFDF5", primaryText: "#047857" },
  { id: "teal",    name: "เขียวน้ำทะเล", primary: "#14B8A6", primaryDark: "#0D9488", primaryLight: "#F0FDFA", primaryText: "#0F766E" },
  { id: "cyan",    name: "ฟ้าสว่าง",     primary: "#06B6D4", primaryDark: "#0891B2", primaryLight: "#ECFEFF", primaryText: "#0E7490" },
  { id: "sky",     name: "ฟ้า",           primary: "#0EA5E9", primaryDark: "#0284C7", primaryLight: "#F0F9FF", primaryText: "#0369A1" },
  { id: "slate",   name: "เทาน้ำเงิน",   primary: "#64748B", primaryDark: "#475569", primaryLight: "#F8FAFC", primaryText: "#334155" },
  { id: "zinc",    name: "เทา",           primary: "#71717A", primaryDark: "#52525B", primaryLight: "#FAFAFA", primaryText: "#3F3F46" },
  { id: "brown",   name: "น้ำตาล",        primary: "#92400E", primaryDark: "#78350F", primaryLight: "#FEF3C7", primaryText: "#78350F" },
  { id: "dark",    name: "เข้ม",          primary: "#1E293B", primaryDark: "#0F172A", primaryLight: "#F1F5F9", primaryText: "#0F172A" },
];

export const DEFAULT_THEME_ID = "blue";

export function applyTheme(id: string) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-dark", theme.primaryDark);
  root.style.setProperty("--primary-light", theme.primaryLight);
  root.style.setProperty("--primary-text", theme.primaryText);
  localStorage.setItem("themeId", theme.id);
}
