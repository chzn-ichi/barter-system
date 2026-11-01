export type OfferItem = {
  id: string;
  listingId: string | null; // set when picked from your own items
  title: string;
  category: string;
  imageUrl: string | null;
  quantity: number;
  bundle: boolean; // "Include in bundle"
};

export type WantItem = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  bundleAllowed: boolean; // "Bundle allowed"
};

export type Candidate = {
  id: string;
  title: string;
  category: string;
  wantsInExchange: string | null;
  openToOffers: boolean;
  bundleAllowed: boolean;
  imageUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerBarangay: string | null;
  createdAt: string;
};

export type MatchResult = {
  listing: Candidate;
  percent: number;
  matchedWant: string;
};

// Weights add up to 100. Tune these freely.
const WEIGHTS = {
  want: 40, // what you want vs. their item
  theirWants: 30, // what they want vs. what you offer
  category: 15,
  bundle: 10,
  quantity: 5,
};

const STOPWORDS = new Set(["a", "an", "the", "of", "or", "and", "for", "any", "some", "with", "to", "in", "my", "your"]);

function stem(token: string) {
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .map(stem);
}

function tokenMatches(a: string, b: string) {
  if (a === b) return true;
  return a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a));
}

// How much of `query` shows up inside `target`, from 0 to 1.
export function containment(query: string, target: string): number {
  const q = tokenize(query);
  if (q.length === 0) return 0;
  const t = tokenize(target);
  const found = q.filter((qt) => t.some((tt) => tokenMatches(qt, tt))).length;
  return found / q.length;
}

// "film camera or headphones" becomes two alternatives, and the best one counts.
function bestAlternative(text: string, target: string): number {
  const alternatives = text
    .split(/\s+or\s+|\s+and\s+|[,/+&]/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (alternatives.length === 0) return 0;
  return Math.max(...alternatives.map((a) => containment(a, target)));
}

export function computeMatches(input: {
  candidates: Candidate[];
  offers: OfferItem[];
  wants: WantItem[];
  myBarangay: string | null;
}): MatchResult[] {
  const { candidates, offers, wants, myBarangay } = input;
  if (offers.length === 0 || wants.length === 0) return [];

  const totalQuantity = offers.reduce((sum, o) => sum + o.quantity, 0);
  const offeringMultiple = offers.length > 1 || totalQuantity > 1;
  const allBundleable = offers.every((o) => o.bundle);
  const offerTexts = offers.map((o) => `${o.title} ${o.category}`);

  const scored: MatchResult[] = [];

  for (const c of candidates) {
    const candidateText = `${c.title} ${c.category}`;

    // Which of your wants does this item satisfy best?
    let best = { want: wants[0], score: 0 };
    for (const w of wants) {
      const s = bestAlternative(w.name, candidateText);
      if (s > best.score) best = { want: w, score: s };
    }

    const categoryHit = !!best.want.category && best.want.category === c.category;
    // Skip items with nothing in common with anything you want.
    if (best.score === 0 && !categoryHit) continue;

    const wantScore = best.score;
    const categoryScore = best.want.category ? (categoryHit ? 1 : 0) : wantScore;

    let theirScore: number;
    if (c.openToOffers) theirScore = 0.7;
    else if (c.wantsInExchange) {
      theirScore = Math.max(...offerTexts.map((t) => bestAlternative(c.wantsInExchange as string, t)));
    } else theirScore = 0.3;

    let bundleScore = 1;
    if (offeringMultiple) {
      bundleScore = !best.want.bundleAllowed ? 0 : (c.bundleAllowed ? 0.6 : 0) + (allBundleable ? 0.4 : 0);
    }

    // Each listing is one unit, so asking for more than one lowers the score.
    const quantityScore = Math.min(1, 1 / Math.max(1, best.want.quantity));

    const percent = Math.round(
      WEIGHTS.want * wantScore +
        WEIGHTS.theirWants * theirScore +
        WEIGHTS.category * categoryScore +
        WEIGHTS.bundle * bundleScore +
        WEIGHTS.quantity * quantityScore
    );

    scored.push({ listing: c, percent: Math.min(100, percent), matchedWant: best.want.name });
  }

  const sameArea = (r: MatchResult) => (myBarangay && r.listing.ownerBarangay === myBarangay ? 1 : 0);

  scored.sort(
    (a, b) =>
      b.percent - a.percent ||
      sameArea(b) - sameArea(a) ||
      new Date(b.listing.createdAt).getTime() - new Date(a.listing.createdAt).getTime()
  );

  // Strong matches are 50% or higher. If there are none, show the closest few.
  const strong = scored.filter((r) => r.percent >= 50);
  return strong.length > 0 ? strong : scored.slice(0, 5);
}