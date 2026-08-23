import { MemberStatus } from './types';

export const DEFAULT_COURSE_ID = 'Rich Maiden';
export const DEFAULT_SCORING_NINE = 'both' as const;

export const MEMBER_STATUSES: MemberStatus[] = ['Riding Member', 'Walking Member', 'Non Member', 'Employee'];

export const CTP_FRONT_HOLES = [4, 6, 8] as const;
export const CTP_BACK_HOLES = [12, 14, 17] as const;

export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
