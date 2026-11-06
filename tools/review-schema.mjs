export const REVIEW_STATUSES=['pending','accepted','rejected','blocked','needs-adjudication'];
export const VERDICTS=['pending','accepted','rejected'];
export const FRESHNESS_VERDICTS=['current','stale','blocked'];
export const REVIEWER_ROLES=['medical-editor','tcm-clinician','public-health-reviewer'];
export const ISSUE_CODES=[
  'quote-not-found','claim-too-broad','action-not-supported','missing-condition',
  'population-mismatch','outdated-source','translation-risk','unsafe-self-care',
  'tcm-scope-overreach','source-unavailable'
];

export function validStatus(value){return REVIEW_STATUSES.includes(value);}
export function validVerdict(value){return VERDICTS.includes(value);}
export function validFreshness(value){return FRESHNESS_VERDICTS.includes(value);}
export function validRole(value){return value===null || REVIEWER_ROLES.includes(value);}
export function validIssues(value){return Array.isArray(value) && value.every(issue=>ISSUE_CODES.includes(issue));}
