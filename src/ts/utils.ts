// Файл допоміжних функцій
const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
const MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

export function $<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Елемент #${id} не знайдено`);
    return el as T;
}

export function monthName(month: number): string {
    return MONTHS[month] ?? '';
}

export function formatPrice(value: number): string {
    return `${value.toLocaleString('uk-UA')} грн`;
}

// Дата у форматі YYYY-MM-DD
export function toISO(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

export function parseISO(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function formatDateLong(iso: string): string {
    const d = parseISO(iso);
    return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function placeholder(text: string): string {
    return `<p class="placeholder">${text}</p>`;
}
