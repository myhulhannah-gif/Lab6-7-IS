import type { BookingState } from './model';
import { isSlotBusy } from './api';
import { chevronLeft, chevronRight } from './icons';
import { monthName, parseISO, toISO } from './utils';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS_AHEAD = 12; // гортати календар можна на рік уперед

// Календар + список вільного часу обраного лікаря (крок 5)
export function createDateTimePicker(box: HTMLElement, state: BookingState, onChange: () => void) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Запис відкритий лише на поточний і наступний місяць (до останнього дня наступного місяця)
    const lastBookable = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const view = { year: today.getFullYear(), month: today.getMonth() };
    let shownDate: string | null = null; // день, на який натиснув користувач

    const monthOffset = () => (view.year - today.getFullYear()) * 12 + (view.month - today.getMonth());

    // Вільні години лікаря на дату (без зайнятих і тих, що вже минули)
    function freeTimes(iso: string): string[] {
        const doctorId = state.doctorId;
        if (!doctorId) return [];
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const isToday = iso === toISO(today);
        const { morning, day, evening } = state.data.timeSlots;
        return [...morning, ...day, ...evening].filter((t) => {
            const [h, m] = t.split(':').map(Number);
            const past = isToday && h * 60 + m <= nowMinutes;
            return !past && !isSlotBusy(doctorId, iso, t);
        });
    }

    // Чи є на цю дату вільний час: дата не в минулому, у межах запису, лікар працює і є вільні години
    function hasFree(date: Date): boolean {
        if (date < today || date > lastBookable) return false;
        if (!state.doctor?.workDays.includes(date.getDay())) return false;
        return freeTimes(toISO(date)).length > 0;
    }

    // Найближча вільна дата відносно сьогодні
    function nearestFreeDate(): Date | null {
        for (let d = new Date(today); d <= lastBookable; d.setDate(d.getDate() + 1)) {
            if (hasFree(d)) return new Date(d);
        }
        return null;
    }

    function monthOptions(): string {
        return Array.from({ length: MONTHS_AHEAD }, (_, i) => {
            const m = (today.getMonth() + i) % 12;
            const y = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
            const label = y === today.getFullYear() ? monthName(m) : `${monthName(m)} ${y}`;
            const selected = y === view.year && m === view.month ? ' selected' : '';
            return `<option value="${y}-${m}"${selected}>${label}</option>`;
        }).join('');
    }

    function calendarHtml(): string {
        const first = new Date(view.year, view.month, 1);
        const offset = (first.getDay() + 6) % 7; // тиждень починається з понеділка
        const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
        const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
        const todayIso = toISO(today);

        const days = Array.from({ length: cells }, (_, i) => {
            const date = new Date(view.year, view.month, i - offset + 1);
            const iso = toISO(date);
            const outside = date.getMonth() !== view.month; // дні сусідніх місяців не натискаються
            const off = !outside && !hasFree(date); // сірий день: клік дозволений, але місць немає
            const classes = ['calendar__day', outside ? 'is-outside' : '', off ? 'is-off' : '', iso === todayIso ? 'is-today' : '', iso === shownDate ? 'is-selected' : ''].filter(Boolean).join(' ');
            return `<button type="button" class="${classes}" data-action="day" data-date="${iso}" ${outside ? 'disabled' : ''}>${date.getDate()}</button>`;
        }).join('');

        return `
            <div class="calendar">
                <div class="calendar__head">
                    <button type="button" class="calendar__nav" data-action="prev" aria-label="Попередній місяць" ${monthOffset() === 0 ? 'disabled' : ''}>${chevronLeft}</button>
                    <div class="select">
                        <select data-action="month" aria-label="Місяць">${monthOptions()}</select>
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <button type="button" class="calendar__nav" data-action="next" aria-label="Наступний місяць" ${monthOffset() >= MONTHS_AHEAD - 1 ? 'disabled' : ''}>${chevronRight}</button>
                </div>
                <div class="calendar__grid">
                    ${WEEKDAYS.map((d) => `<span class="calendar__weekday">${d}</span>`).join('')}
                    ${days}
                </div>
            </div>`;
    }

    function slotsHtml(): string {
        if (!shownDate) {
            return '<p class="slots__hint">Оберіть дату, щоб побачити вільний час.</p>';
        }

        // На обрану дату немає вільних місць: підказуємо найближчу вільну дату
        if (!hasFree(parseISO(shownDate))) {
            const next = nearestFreeDate();
            const nextText = next ? next.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
            return `
                <div class="slots__full">
                    <h3 class="slots__full-title">На цей день немає вільних місць</h3>
                    ${
                        next
                            ? `<p class="slots__hint">Наступна вільна дата:<br>${nextText}</p>
                               <button type="button" class="btn btn--solid" data-action="nearest" data-date="${toISO(next)}">Перейдіть до найближчої дати</button>`
                            : '<p class="slots__hint">Найближчим часом вільних місць немає. Оберіть іншого лікаря.</p>'
                    }
                </div>`;
        }

        const free = freeTimes(shownDate);
        const groups: [string, string[]][] = [
            ['Ранок', state.data.timeSlots.morning],
            ['День', state.data.timeSlots.day],
            ['Вечір', state.data.timeSlots.evening]
        ];
        return `
            <h3 class="slots__title">Вільний час:</h3>
            ${groups
                .map(([label, times]) => {
                    const buttons = times
                        .map((t) => `<button type="button" class="slots__slot${t === state.time ? ' is-selected' : ''}" data-action="time" data-time="${t}" ${free.includes(t) ? '' : 'disabled'}>${t}</button>`)
                        .join('');
                    return `<div class="slots__group"><span class="slots__label">${label}</span><div class="slots__list">${buttons}</div></div>`;
                })
                .join('')}`;
    }

    function render(): void {
        // Якщо лікаря змінили (дату в стані скинуто), а показана дата була вільною — забуваємо її
        if (shownDate && state.date === null && hasFree(parseISO(shownDate))) shownDate = null;
        box.innerHTML = `<div class="datetime">${calendarHtml()}<div class="datetime__slots slots">${slotsHtml()}</div></div>`;
    }

    // Клік по дню (будь-якому, навіть сірому)
    function pickDate(iso: string): void {
        shownDate = iso;
        const d = parseISO(iso);
        view.year = d.getFullYear();
        view.month = d.getMonth();
        if (hasFree(d)) {
            state.setDate(iso);
        } else {
            // Дата без місць у запис не потрапляє
            state.date = null;
            state.time = null;
        }
        render();
        onChange();
    }

    box.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!target || target instanceof HTMLSelectElement) return;
        const action = target.dataset.action;
        if (action === 'prev' || action === 'next') {
            const next = new Date(view.year, view.month + (action === 'next' ? 1 : -1), 1);
            view.year = next.getFullYear();
            view.month = next.getMonth();
            render();
        } else if ((action === 'day' || action === 'nearest') && target.dataset.date) {
            pickDate(target.dataset.date);
        } else if (action === 'time' && target.dataset.time) {
            state.time = target.dataset.time;
            render();
            onChange();
        }
    });

    box.addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        if (select.dataset.action !== 'month') return;
        const [y, m] = select.value.split('-').map(Number);
        view.year = y;
        view.month = m;
        render();
    });

    return { render };
}