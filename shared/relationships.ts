// Single source of truth for relationship value → label/colour.
// Used by the grid, the add-stakeholder form's dropdown, and the server's validation.
export interface RelationshipMeta {
  value: number;
  label: string;
  color: string;
}

export const RELATIONSHIPS: RelationshipMeta[] = [
  { value: 1, label: 'Blocker', color: '#E24B4A' },
  { value: 2, label: 'Sceptic', color: '#EF9F27' },
  { value: 3, label: 'Neutral', color: '#888780' },
  { value: 4, label: 'Supporter', color: '#97C459' },
  { value: 5, label: 'Advocate', color: '#1D9E75' },
];

/** Valid relationship values (1–5), derived from the list above. */
export const RELATIONSHIP_VALUES: number[] = RELATIONSHIPS.map((r) => r.value);
