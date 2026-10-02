import { CalendarBlank, ChartLineUp, Flag, ListChecks, Robot, type Icon } from '@phosphor-icons/react';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
}

export const NAV: NavItem[] = [
  { to: '/app/today', label: 'Today', icon: Flag },
  { to: '/app/habits', label: 'Habits', icon: ListChecks },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarBlank },
  { to: '/app/insights', label: 'Insights', icon: ChartLineUp },
  { to: '/app/cipher', label: 'CIPHER', icon: Robot },
];
