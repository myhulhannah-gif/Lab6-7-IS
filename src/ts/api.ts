import type { Appointment, ClinicData, Pet } from './model';
import { hash } from './utils';

const PETS_KEY = 'vetclinic.pets.v2';
const APPOINTMENTS_KEY = 'vetclinic.appointments';

// Дані беремо з JSON: або з хмарного сховища (VITE_DATA_URL), або з public/data.json
export async function loadData(): Promise<ClinicData> {
    const url = (import.meta.env.VITE_DATA_URL as string | undefined) || `${import.meta.env.BASE_URL}data.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Не вдалося завантажити дані: ${response.status}`);
    return (await response.json()) as ClinicData;
}

function read<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
        return [];
    }
}

function write<T>(key: string, items: T[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch {
        // localStorage недоступний (приватний режим) — працюємо без збереження
    }
}

// Список тварин зберігається в браузері повністю (разом із тими, що були в data.json),
// тому тварину можна і додати, і видалити
export function loadPets(initial: Pet[]): Pet[] {
    try {
        const raw = localStorage.getItem(PETS_KEY);
        return raw ? (JSON.parse(raw) as Pet[]) : initial;
    } catch {
        return initial;
    }
}

export function savePets(pets: Pet[]): void {
    write(PETS_KEY, pets);
}

export function saveAppointment(appointment: Appointment): void {
    write(APPOINTMENTS_KEY, [...read<Appointment>(APPOINTMENTS_KEY), appointment]);
}

// Час зайнятий, якщо в лікаря вже є запис (збережений у браузері або «існуючий» у розкладі клініки).
// Існуючі записи клініки емулюються детермінованою функцією від лікаря, дати й часу.
export function isSlotBusy(doctorId: string, date: string, time: string): boolean {
    const saved = read<Appointment>(APPOINTMENTS_KEY).some((a) => a.doctorId === doctorId && a.date === date && a.time === time);
    return saved || hash(`${doctorId}|${date}|${time}`) % 100 < 25;
}
