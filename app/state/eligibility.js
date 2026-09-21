// What the card is allowed to claim about a posting's degree requirement.
//
// The first version printed "Bachelor accepted" above every quote,
// unconditionally. That is false for anything admitted under the
// content/AI block, which explicitly permits a Master requirement — #278
// ("Holder of a Master's or PhD …") was shown as Bachelor-accepted. A
// label that can be wrong is worse than none, because the whole point of
// the quote box is that it is evidence.
//
// The claim is warranted by the admission rule, not guessed from the text.
// For the eight original categories, rule 4 of the daily agent's prompt
// excludes "any posting whose stated minimum is a Master or a doctorate",
// so a posting being in the list at all means a Bachelor was verified as
// sufficient. The content/AI block is the stated exception: there a Master
// requirement is allowed in, so there — and only there — the label has to
// be read off the posting's own words.
//
// Read off `eligibility_quote_de`, which is the employer's sentence.
// `eligibility_en` is our own gloss and frequently contains phrases like
// "no Master required" or "the PhD is only ideally", whose negations
// invert a naive keyword match. It is never used for classification.

const HIGHER = /\bmaster'?s?\b|\bm\.?sc\b|magister|diplom|\bph\.?d\b|promotion|doktor|doctoral|staatsexamen/i;

// There is deliberately no "preferred" tier. An earlier version tried to
// soften the label when the sentence also said "ideally" or "von Vorteil",
// and got it backwards on the cases that matter: in "A Master's degree or
// ideally a PhD" the softener attaches to the PhD while the Master remains
// the floor, and the card would have called that a preference. Whether a
// stated degree binds is a judgement; that it is *stated* is a fact, and
// the card reports only the fact. The quote sits right below it.

/**
 * @param {{category?: string, eligibility_quote_de?: string}} posting
 * @returns {{label: string, tone: 'ok'|'warn'|'neutral'}}
 */
export function eligibilityLabel(posting) {
  const quote = posting.eligibility_quote_de ?? '';

  // The eight original categories: admission itself is the guarantee.
  if (posting.category !== 'content') {
    return { label: 'Bachelor accepted', tone: 'ok' };
  }

  // The content / AI-training block, where a Master may legitimately be
  // required. Say what the posting says.
  if (!quote) return { label: 'Stated requirement', tone: 'neutral' };

  if (HIGHER.test(quote)) {
    return { label: "Master's / PhD stated", tone: 'warn' };
  }
  return { label: 'Bachelor accepted', tone: 'ok' };
}
