// Permit-type logic for the provider quiz (F6).
// Legal basis: Texas Human Resources Code Ch. 42.
//   §42.002: "family home" = regular care in the caretaker's own residence for not more than 6 children under 14
//            (excluding related children), plus up to 6 additional elementary school children after school,
//            total including related children not over 12. "Group day-care home" = 7+ children at the residence.
//            "Day-care center" = 7+ children at a location other than the residence.
//   §42.052: family home caring for 4+ unrelated children must register; for compensation caring for 3 or fewer
//            must list; caring only for related children needs neither.
// Checked 2026-09-26. HHSC administrative rules (26 TAC Ch. 746/747) add details the quiz does not cover.

export type Location = 'home' | 'other';
export type Count = '0' | '1-3' | '4-6' | '7-12' | '13+';
export type Deed = 'no' | 'yes' | 'unsure';

export type Answers = { location?: Location; unrelated?: Count; paid?: boolean; deed?: Deed };

export type Outcome =
  | 'related_only'      // no permit needed for related children only
  | 'unpaid_small'      // 3 or fewer unrelated, unpaid: listing requirement is tied to compensation
  | 'listed'
  | 'registered'
  | 'licensed_home'
  | 'center'
  | 'too_many_for_home'
  | 'center_small';     // away from home, fewer than 7: not a day-care center by definition; ask HHSC

export type Result = {
  outcome: Outcome;
  permitType: 'listed' | 'registered' | 'licensed_home' | null; // matches pathway_steps.permit_type
  deedWarning: 'blocker' | 'check' | null;
};

export function evaluate(a: Answers): Result | null {
  if (!a.location || !a.unrelated) return null;
  const deedWarning = a.location === 'home' ? (a.deed === 'yes' ? 'blocker' : a.deed === 'no' ? null : 'check') : null;

  if (a.location === 'other') {
    const small = a.unrelated === '0' || a.unrelated === '1-3' || a.unrelated === '4-6';
    return { outcome: small ? 'center_small' : 'center', permitType: null, deedWarning };
  }
  switch (a.unrelated) {
    case '0':
      return { outcome: 'related_only', permitType: null, deedWarning };
    case '1-3':
      return a.paid === false
        ? { outcome: 'unpaid_small', permitType: null, deedWarning }
        : { outcome: 'listed', permitType: 'listed', deedWarning };
    case '4-6':
      return { outcome: 'registered', permitType: 'registered', deedWarning };
    case '7-12':
      return { outcome: 'licensed_home', permitType: 'licensed_home', deedWarning };
    case '13+':
      return { outcome: 'too_many_for_home', permitType: null, deedWarning };
  }
}

const LOCATIONS = new Set(['home', 'other']);
const COUNTS = new Set(['0', '1-3', '4-6', '7-12', '13+']);
const DEEDS = new Set(['no', 'yes', 'unsure']);

export function parseAnswers(sp: Record<string, string | string[] | undefined>): Answers {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const location = one('location');
  const unrelated = one('unrelated');
  const deed = one('deed');
  const paid = one('paid');
  return {
    location: location && LOCATIONS.has(location) ? (location as Location) : undefined,
    unrelated: unrelated && COUNTS.has(unrelated) ? (unrelated as Count) : undefined,
    paid: paid === 'yes' ? true : paid === 'no' ? false : undefined,
    deed: deed && DEEDS.has(deed) ? (deed as Deed) : undefined,
  };
}
