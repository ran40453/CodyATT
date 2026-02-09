import Holidays from 'date-holidays';

const hd = new Holidays('TW');

/**
 * Checks if a given date is a Taiwan public holiday.
 * @param {Date|string} date - Date object or ISO string.
 * @returns {boolean}
 */
export const isTaiwanHoliday = (date) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return false;

        const holidays = hd.isHoliday(d);
        // date-holidays returns an array of holidays for that day, or false
        if (holidays && Array.isArray(holidays)) {
            // We only care about public holidays
            return holidays.some(h => h.type === 'public');
        }
        return !!holidays;
    } catch (e) {
        console.error('isTaiwanHoliday error:', e);
        return false;
    }
};

/**
 * Gets the holiday name if it exists.
 * @param {Date|string} date 
 * @returns {string|null}
 */
export const getHolidayName = (date) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;

        const holidays = hd.isHoliday(d);
        if (holidays && Array.isArray(holidays)) {
            const publicHoliday = holidays.find(h => h.type === 'public');
            return publicHoliday ? publicHoliday.name : null;
        }
        return null;
    } catch (e) {
        return null;
    }
};
