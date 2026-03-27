import dayjs from 'dayjs';
import 'dayjs/locale/id';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.locale('id');

export function formatDate(date: string | Date | null, fmt = 'DD MMM YYYY'): string {
  if (!date) return '-';
  return dayjs(date).format(fmt);
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  return dayjs(date).format('DD MMM YYYY, HH:mm');
}

export function formatTime(date: string | Date | null): string {
  if (!date) return '-';
  return dayjs(date).format('HH:mm');
}

export function today(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function now(): string {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

export function startOfMonth(): string {
  return dayjs().startOf('month').format('YYYY-MM-DD');
}

export function endOfMonth(): string {
  return dayjs().endOf('month').format('YYYY-MM-DD');
}

export function startOfWeek(): string {
  return dayjs().startOf('week').format('YYYY-MM-DD');
}

export { dayjs };
