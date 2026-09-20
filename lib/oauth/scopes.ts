// API token scopes. A token carries either one preset or a granular list.
export const PRESET_SCOPES = ["apis.all", "apis.read"] as const;

export const GRANULAR_SCOPES = [
  "documents.read",
  "documents.write",
  "links.read",
  "links.write",
  "analytics.read",
  "visitors.read",
] as const;

export type PresetScope = (typeof PRESET_SCOPES)[number];
export type GranularScope = (typeof GRANULAR_SCOPES)[number];
export type Scope = PresetScope | GranularScope;
