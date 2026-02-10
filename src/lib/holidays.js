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
        if (holidays && Array.isArray(holidays)) {
            // Only actual public holidays + 勞動節 (observance but real day off)
            return holidays.some(h => h.type === 'public' || h.name === '勞動節');
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
            // Only return names for actual public holidays + 勞動節
            const h = holidays.find(h => h.type === 'public') || holidays.find(h => h.name === '勞動節');
            return h ? h.name : null;
        }
        return null;
    } catch (e) {
        return null;
    }
};
