const svg = (body: string) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const stroke = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const chevronRight = svg(`<path d="M9 5l7 7-7 7" ${stroke}/>`);
export const chevronLeft = svg(`<path d="M15 5l-7 7 7 7" ${stroke}/>`);
export const clock = '<img class="icon" src="/img/icons/clock.svg" alt="">';
export const pin = svg(`<path d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" fill="currentColor" stroke="none" class="icon__dot"/>`);
