import type { Service } from './model';
import { $, escapeHtml, formatPrice } from './utils';
import { clock } from './icons';

// Слайдер послуг на головній: переміщує по одній картці, кількість видимих карток задає CSS (--per-view)
export function initSlider(services: Service[], onChoose: (serviceId: string) => void): void {
    const track = $('slider-track');
    const slider = track.closest<HTMLElement>('.slider');
    const prev = $<HTMLButtonElement>('slider-prev');
    const next = $<HTMLButtonElement>('slider-next');
    const dotsBox = $('slider-dots');
    if (!slider) return;

    track.innerHTML = services
        .map(
            (s) => `
        <li class="service-card">
            <img class="service-card__img" src="${s.image}" alt="${escapeHtml(s.name)}" loading="lazy">
            <div class="service-card__body">
                <div>
                    <h3 class="service-card__name">${escapeHtml(s.name)}</h3>
                    <div class="service-card__meta">
                        <span class="service-card__duration">${clock}${s.duration} хв</span>
                        <span>${formatPrice(s.price)}</span>
                    </div>
                </div>
                <button class="btn btn--outline" type="button" data-id="${s.id}">Обрати</button>
            </div>
        </li>`
        )
        .join('');

    let index = 0;
    const perView = () => Number(getComputedStyle(slider).getPropertyValue('--per-view')) || 1;
    const maxIndex = () => Math.max(0, services.length - perView());

    function renderDots(): void {
        dotsBox.innerHTML = Array.from({ length: maxIndex() + 1 }, (_, i) => `<button class="slider__dot${i === index ? ' is-active' : ''}" type="button" role="tab" aria-label="Слайд ${i + 1}" aria-selected="${i === index}" data-index="${i}"></button>`).join('');
    }

    function update(): void {
        index = Math.min(index, maxIndex());
        const cards = track.children;
        const offset = cards.length > 0 ? (cards[index] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft : 0;
        track.style.transform = `translateX(${-offset}px)`;
        prev.disabled = index === 0;
        next.disabled = index >= maxIndex();
        renderDots();
    }

    prev.addEventListener('click', () => {
        index = Math.max(0, index - 1);
        update();
    });
    next.addEventListener('click', () => {
        index = Math.min(maxIndex(), index + 1);
        update();
    });
    dotsBox.addEventListener('click', (e) => {
        const dot = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
        if (!dot) return;
        index = Number(dot.dataset.index);
        update();
    });
    track.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
        if (btn?.dataset.id) onChoose(btn.dataset.id);
    });
    window.addEventListener('resize', update);
    update();
}
