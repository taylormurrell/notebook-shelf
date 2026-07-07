// Curated style tokens for notebooks: cover colors, page colors, fonts.
// Curated on purpose (no free color picker) per the PRD.

export type CoverColor =
  | "cover_berry"
  | "cover_teal"
  | "cover_blue"
  | "cover_mustard"
  | "cover_forest";

export type PageColor = "page_ivory" | "page_cream" | "page_parchment";

export type FontStyle =
  | "font_serif_warm"
  | "font_serif_clean"
  | "font_typewriter"
  | "font_handwriting";

type CoverStyle = {
  label: string;
  base: string; // main cover color
  sheen: string; // lighter diagonal highlight
  dark: string; // binding + shadow edge
};

// Each cover has a light "sheen" and darker "dark" so it can be rendered with a
// soft diagonal gradient + binding — no images or 3D.
export const COVER_COLORS: Record<CoverColor, CoverStyle> = {
  cover_berry: { label: "Berry", base: "#9a0948", sheen: "#b81c60", dark: "#750735" },
  cover_teal: { label: "Teal", base: "#077077", sheen: "#0c9198", dark: "#05565b" },
  cover_blue: { label: "Cobalt blue", base: "#124cb8", sheen: "#2a63d1", dark: "#0d3a8c" },
  cover_mustard: { label: "Mustard", base: "#c0993e", sheen: "#d0aa4e", dark: "#9c7c2f" },
  cover_forest: { label: "Forest green", base: "#3a5244", sheen: "#47624f", dark: "#2c3f34" },
};

// Fallback for any notebook still holding a retired token (e.g. from before a
// palette change), so lookups never return undefined and crash a page.
export const DEFAULT_COVER_COLOR: CoverColor = "cover_blue";
export function coverStyle(token: string): CoverStyle {
  return COVER_COLORS[token as CoverColor] ?? COVER_COLORS[DEFAULT_COVER_COLOR];
}

export const PAGE_COLORS: Record<PageColor, { label: string; hex: string }> = {
  page_ivory: { label: "Warm ivory", hex: "#fbf7ec" },
  page_cream: { label: "Soft cream", hex: "#f6efdd" },
  page_parchment: { label: "Light parchment", hex: "#efe6d0" },
};

// Font families use already-loaded / system stacks for MVP. Module 5 can load
// dedicated webfonts if we want a stronger typewriter/serif feel.
export const FONTS: Record<FontStyle, { label: string; css: string }> = {
  font_serif_warm: { label: "Warm serif", css: "var(--font-lora), Georgia, serif" },
  font_serif_clean: { label: "Clean serif", css: "Georgia, 'Times New Roman', serif" },
  font_typewriter: { label: "Typewriter", css: "ui-monospace, 'Courier New', monospace" },
  font_handwriting: { label: "Handwriting", css: "var(--font-caveat), 'Segoe Script', cursive" },
};

export const COVER_COLOR_KEYS = Object.keys(COVER_COLORS) as CoverColor[];
export const PAGE_COLOR_KEYS = Object.keys(PAGE_COLORS) as PageColor[];
export const FONT_KEYS = Object.keys(FONTS) as FontStyle[];

// Sticky-tab colors. Meanings are suggestions surfaced as tooltips, not enforced.
export type TabColor =
  | "tab_lilac"
  | "tab_blush"
  | "tab_peach"
  | "tab_turquoise"
  | "tab_mint"
  | "tab_banana";

// Soft pastel highlighter palette. Meanings are suggestions (tooltips), not enforced.
export const TAB_COLORS: Record<TabColor, { label: string; meaning: string; hex: string }> = {
  tab_lilac: { label: "Lilac", meaning: "Ideas", hex: "#c3aed6" },
  tab_blush: { label: "Blush", meaning: "Important", hex: "#e6b3b8" },
  tab_peach: { label: "Peach", meaning: "Action items", hex: "#eeb08a" },
  tab_turquoise: { label: "Turquoise", meaning: "Concepts", hex: "#a3d5cd" },
  tab_mint: { label: "Mint", meaning: "Examples", hex: "#bcd9a0" },
  tab_banana: { label: "Banana", meaning: "Revisit", hex: "#f2dd8c" },
};

export const TAB_COLOR_KEYS = Object.keys(TAB_COLORS) as TabColor[];
