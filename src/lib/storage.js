import { format } from 'date-fns';

const DATA_KEY = 'ot-calculation-data';
const SETTINGS_KEY = 'ot-calculation-settings';

const defaultSettings = {
    allowance: {
        tripDaily: 50, // USD
        exchangeRate: 32.5, // USD to TWD
    },
    salary: {
        baseMonthly: 50000,
        hourlyRate: 50000 / 30 / 8,
    },
    rules: {
        ot1: 1.34,
        ot2: 1.67,
        ot3: 2.0,
    }
};

export const loadData = () => {
    const data = localStorage.getItem(DATA_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveData = (data) => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
};

export const loadSettings = () => {
    const settings = localStorage.getItem(SETTINGS_KEY);
    return settings ? JSON.parse(settings) : defaultSettings;
};

export const saveSettings = (settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const addOrUpdateRecord = (record) => {
    const data = loadData();
    const dateStr = format(new Date(record.date), 'yyyy-MM-dd');
    const index = data.findIndex(r => format(new Date(r.date), 'yyyy-MM-dd') === dateStr);

    if (index >= 0) {
        data[index] = { ...data[index], ...record };
    } else {
        data.push(record);
    }

    saveData(data);
    return data;
};

export const deleteRecord = (date) => {
    const data = loadData();
    const dateStr = format(new Date(date), 'yyyy-MM-dd');
    const filtered = data.filter(r => format(new Date(r.date), 'yyyy-MM-dd') !== dateStr);
    saveData(filtered);
    return filtered;
};
