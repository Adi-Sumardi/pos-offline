import { generateTrxCode, generateMemberCode, generateSku, todayTrxPrefix } from '@/utils/trxCode';

jest.mock('dayjs', () => {
  const originalDayjs = jest.requireActual('dayjs');
  const mockDayjs = (date?: any) => originalDayjs('2026-03-26');
  mockDayjs.extend = originalDayjs.extend;
  mockDayjs.locale = originalDayjs.locale;
  return mockDayjs;
});

describe('trxCode utils', () => {
  describe('generateTrxCode', () => {
    it('should generate correct format TRX-YYYYMMDD-XXXX', () => {
      expect(generateTrxCode(1)).toBe('TRX-20260326-0001');
    });

    it('should pad sequence to 4 digits', () => {
      expect(generateTrxCode(1)).toContain('0001');
      expect(generateTrxCode(42)).toContain('0042');
      expect(generateTrxCode(999)).toContain('0999');
      expect(generateTrxCode(1000)).toContain('1000');
    });

    it('should handle sequence > 9999', () => {
      expect(generateTrxCode(10000)).toBe('TRX-20260326-10000');
    });

    it('should throw on sequence = 0 (FIXED)', () => {
      expect(() => generateTrxCode(0)).toThrow();
    });

    it('should throw on negative sequence (FIXED)', () => {
      expect(() => generateTrxCode(-1)).toThrow();
    });

    it('should throw on non-integer sequence (FIXED)', () => {
      expect(() => generateTrxCode(1.5)).toThrow();
    });
  });

  describe('generateMemberCode', () => {
    it('should generate correct format MBR-XXXX', () => {
      expect(generateMemberCode(1)).toBe('MBR-0001');
      expect(generateMemberCode(42)).toBe('MBR-0042');
    });

    it('should throw on invalid sequence (FIXED)', () => {
      expect(() => generateMemberCode(0)).toThrow();
      expect(() => generateMemberCode(-1)).toThrow();
    });
  });

  describe('generateSku', () => {
    it('should generate SKU from category name', () => {
      expect(generateSku('Oli', 1)).toBe('OLI-001');
    });

    it('should strip non-alphanumeric chars and truncate to 4', () => {
      expect(generateSku('Busi & Kelistrikan', 5)).toBe('BUSI-005');
    });

    it('should handle short category names', () => {
      expect(generateSku('A', 1)).toBe('A-001');
    });

    it('should throw on empty category name (FIXED)', () => {
      expect(() => generateSku('', 1)).toThrow();
    });

    it('should throw on category with only special characters (FIXED)', () => {
      expect(() => generateSku('!@#$', 1)).toThrow();
    });

    it('should throw on invalid sequence (FIXED)', () => {
      expect(() => generateSku('Oli', 0)).toThrow();
      expect(() => generateSku('Oli', -1)).toThrow();
    });

    it('should include numbers from category name', () => {
      expect(generateSku('Filter 2023', 1)).toBe('FILT-001');
    });
  });

  describe('todayTrxPrefix', () => {
    it('should return TRX-YYYYMMDD- format', () => {
      expect(todayTrxPrefix()).toBe('TRX-20260326-');
    });

    it('should end with dash', () => {
      expect(todayTrxPrefix().endsWith('-')).toBe(true);
    });
  });
});
