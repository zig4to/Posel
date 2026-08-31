// Preset paleta barv za samodejno dodelitev novi stranki.
// Barve so izbrane tako, da so med seboj dovolj različne in berljive na belem ozadju.
export const CLIENT_COLOR_PALETTE = [
  "#3B82F6", // modra
  "#F97316", // oranžna
  "#10B981", // zelena
  "#EF4444", // rdeča
  "#8B5CF6", // vijolična
  "#EC4899", // roza
  "#14B8A6", // turkizna
  "#F59E0B", // jantarna
  "#6366F1", // indigo
  "#84CC16", // limeta
] as const;

/**
 * Vrne naslednjo barvo iz palete glede na trenutno število strank
 * (round-robin), da so barve zaporednih strank čim bolj različne.
 */
export function nextClientColor(existingClientCount: number): string {
  const index = existingClientCount % CLIENT_COLOR_PALETTE.length;
  return CLIENT_COLOR_PALETTE[index];
}
