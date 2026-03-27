import { formatDate, formatDateTime, formatTime, today, now, startOfMonth, endOfMonth, startOfWeek } from '@/utils/date';

describe('date utils', () => {
  // ═══════════════════════════════════════════════════════
  // formatDate
  // ═══════════════════════════════════════════════════════
  describe('formatDate', () => {
    it('should format date string with default format', () => {
      const result = formatDate('2026-03-26');
      expect(result).toBeDefined();
      expect(result).not.toBe('-');
      expect(result).toContain('26');
    });

    it('should return dash for null', () => {
      expect(formatDate(null)).toBe('-');
    });

    it('should return dash for empty string (falsy)', () => {
      // Empty string is falsy but still a string — the check is `if (!date)`
      expect(formatDate('')).toBe('-');
    });

    it('should accept Date object', () => {
      const result = formatDate(new Date('2026-03-26'));
      expect(result).not.toBe('-');
    });

    it('should accept custom format', () => {
      const result = formatDate('2026-03-26', 'YYYY/MM/DD');
      expect(result).toBe('2026/03/26');
    });

    // BUG CHECK: Invalid date string
    it('should handle invalid date string', () => {
      const result = formatDate('not-a-date');
      // dayjs('not-a-date') returns Invalid Date object
      // dayjs(invalid).format() returns "Invalid Date"
      expect(result).toBe('Invalid Date');
    });

    // BUG CHECK: The function doesn't validate dates
    it('should handle impossible date', () => {
      // Feb 30 doesn't exist
      const result = formatDate('2026-02-30');
      // dayjs may silently convert or return invalid
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════
  // formatDateTime
  // ═══════════════════════════════════════════════════════
  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const result = formatDateTime('2026-03-26T14:30:00');
      expect(result).not.toBe('-');
      expect(result).toContain('14:30');
    });

    it('should return dash for null', () => {
      expect(formatDateTime(null)).toBe('-');
    });
  });

  // ═══════════════════════════════════════════════════════
  // formatTime
  // ═══════════════════════════════════════════════════════
  describe('formatTime', () => {
    it('should format time only', () => {
      const result = formatTime('2026-03-26T14:30:00');
      expect(result).toBe('14:30');
    });

    it('should return dash for null', () => {
      expect(formatTime(null)).toBe('-');
    });
  });

  // ═══════════════════════════════════════════════════════
  // today
  // ═══════════════════════════════════════════════════════
  describe('today', () => {
    it('should return YYYY-MM-DD format', () => {
      const result = today();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ═══════════════════════════════════════════════════════
  // now
  // ═══════════════════════════════════════════════════════
  describe('now', () => {
    it('should return YYYY-MM-DD HH:mm:ss format', () => {
      const result = now();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  // ═══════════════════════════════════════════════════════
  // startOfMonth
  // ═══════════════════════════════════════════════════════
  describe('startOfMonth', () => {
    it('should return first day of current month', () => {
      const result = startOfMonth();
      expect(result).toMatch(/^\d{4}-\d{2}-01$/);
    });
  });

  // ═══════════════════════════════════════════════════════
  // endOfMonth
  // ═══════════════════════════════════════════════════════
  describe('endOfMonth', () => {
    it('should return last day of current month', () => {
      const result = endOfMonth();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const day = parseInt(result.split('-')[2], 10);
      expect(day).toBeGreaterThanOrEqual(28);
      expect(day).toBeLessThanOrEqual(31);
    });
  });

  // ═══════════════════════════════════════════════════════
  // startOfWeek
  // ═══════════════════════════════════════════════════════
  describe('startOfWeek', () => {
    it('should return YYYY-MM-DD format', () => {
      const result = startOfWeek();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
