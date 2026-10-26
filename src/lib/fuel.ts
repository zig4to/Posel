// Trenutna cena dizla v Sloveniji z goriva.si (neuradni javni API).
// Cena dizla izven avtocest je regulirana in enaka na vseh črpalkah, zato
// vzamemo najpogostejšo ceno med vrnjenimi črpalkami (avtocestne odstopajo).
// Samo na strežniku; rezultat Next predpomni 1 uro.

const GORIVA_URL = "https://goriva.si/api/v1/search/?position=Ljubljana";

type GorivaResponse = {
  results?: { prices?: { dizel?: number | null } }[];
};

/** Cena dizla v EUR/l ali null, če je ni bilo mogoče pridobiti. */
export async function getCurrentDieselPrice(): Promise<number | null> {
  try {
    const res = await fetch(GORIVA_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GorivaResponse;

    const counts = new Map<number, number>();
    for (const station of data.results ?? []) {
      const price = station.prices?.dizel;
      if (typeof price === "number" && price > 0) {
        counts.set(price, (counts.get(price) ?? 0) + 1);
      }
    }

    let best: number | null = null;
    let bestCount = 0;
    for (const [price, count] of counts) {
      if (count > bestCount) {
        best = price;
        bestCount = count;
      }
    }
    return best;
  } catch {
    return null;
  }
}
