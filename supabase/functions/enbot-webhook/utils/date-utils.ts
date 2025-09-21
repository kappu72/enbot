/**
 * Date and month utilities for the EnBot application
 * Centralized management of month data and date operations
 */

/**
 * Month data interface
 */
export interface MonthData {
  /** Two-digit month number (01-12) */
  number: string;
  /** Three-letter abbreviation */
  abbr: string;
  /** Full month name in Italian */
  full: string;
}

/**
 * Complete months data for Italian locale
 * Ordered from January (01) to December (12)
 */
export const MONTHS: MonthData[] = [
  { number: '01', abbr: 'GEN', full: 'Gennaio' },
  { number: '02', abbr: 'FEB', full: 'Febbraio' },
  { number: '03', abbr: 'MAR', full: 'Marzo' },
  { number: '04', abbr: 'APR', full: 'Aprile' },
  { number: '05', abbr: 'MAG', full: 'Maggio' },
  { number: '06', abbr: 'GIU', full: 'Giugno' },
  { number: '07', abbr: 'LUG', full: 'Luglio' },
  { number: '08', abbr: 'AGO', full: 'Agosto' },
  { number: '09', abbr: 'SET', full: 'Settembre' },
  { number: '10', abbr: 'OTT', full: 'Ottobre' },
  { number: '11', abbr: 'NOV', full: 'Novembre' },
  { number: '12', abbr: 'DIC', full: 'Dicembre' },
];

/**
 * Get month data by its number (e.g., "01" for January)
 * 
 * @param monthNumber - Two-digit month number string ("01" to "12")
 * @returns MonthData object or undefined if not found
 * 
 * @example
 * ```typescript
 * const january = getMonthByNumber("01");
 * console.log(january?.full); // "Gennaio"
 * console.log(january?.abbr); // "GEN"
 * ```
 */
export function getMonthByNumber(monthNumber: string): MonthData | undefined {
  return MONTHS.find((m) => m.number === monthNumber);
}

/**
 * Get month data by its 0-based index (0-11, as used by Date.getMonth())
 * 
 * @param monthIndex - Zero-based month index (0 = January, 11 = December)
 * @returns MonthData object or undefined if index is out of range
 * 
 * @example
 * ```typescript
 * const currentMonth = new Date().getMonth();
 * const monthData = getMonthByIndex(currentMonth);
 * ```
 */
export function getMonthByIndex(monthIndex: number): MonthData | undefined {
  if (monthIndex < 0 || monthIndex > 11) {
    return undefined;
  }
  return MONTHS[monthIndex];
}

/**
 * Get months arranged with previous month first, current month second, then others
 * Useful for UI where recent months should be prioritized
 * 
 * @returns Array of MonthData in the arranged order
 */
export function getMonthsArrangement(): MonthData[] {
  const currentMonth = new Date().getMonth(); // 0-based (0 = January)
  const previousMonth = (currentMonth - 1 + 12) % 12; // Handle wrap-around for January

  // Start with previous month, then current, then the rest
  const reorderedMonths = [
    MONTHS[previousMonth], // Previous month first
    MONTHS[currentMonth], // Current month second
    // Then all other months, excluding previous and current
    ...MONTHS.filter((_, index) =>
      index !== previousMonth && index !== currentMonth
    ),
  ];

  return reorderedMonths;
}

/**
 * Get three years: previous, current, next
 * Useful for year selection interfaces
 * 
 * @returns Array of year strings [previousYear, currentYear, nextYear]
 */
export function getYearsArrangement(): string[] {
  const currentYear = new Date().getFullYear();
  return [
    (currentYear - 1).toString(), // Previous year
    currentYear.toString(), // Current year
    (currentYear + 1).toString(), // Next year
  ];
}

/**
 * Get current month name in Italian
 * 
 * @returns Full name of current month
 */
export function getCurrentMonthName(): string {
  const currentMonth = new Date().getMonth();
  return MONTHS[currentMonth].full;
}

/**
 * Get current year as string
 * 
 * @returns Current year as string
 */
export function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}
