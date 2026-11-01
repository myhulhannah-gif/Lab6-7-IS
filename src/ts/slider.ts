import type { Service } from './model';
import { $, formatPrice } from './utils';
import { clock } from './icons';

// Слайдер послуг на головній
export function initSlider(services: Service[], onChoose: (serviceId: string) => void): void {
    const track = $('slider-track');
    const prev = $<HTMLButtonElement>('slider-prev');
    const next = $<HTMLButtonElement>('slider-next');

    track.innerHTML = services
        .map(
            (s) => `
        <li class="service-card">
            <img class="service-card__img" src="${s.image}" alt="${s.name}" loading="lazy">
            <div class="service-card__body">
                <div>
                    <h3 class="service-card__name">${s.name}</h3>
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
    const perView = () => (window.innerWidth <= 480 ? 1 : window.innerWidth <= 1024 ? 2 : 3);
    const maxIndex = () => Math.max(0, services.length - perView());

    function update(): void {
        index = Math.min(index, maxIndex());
        const cards = track.children;
        const offset = cards.length > 0 ? (cards[index] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft : 0;
        track.style.transform = `translateX(${-offset}px)`;
        prev.disabled = index === 0;
        next.disabled = index >= maxIndex();
    }

    prev.addEventListener('click', () => {
        index -= 1;
        update();
    });
    next.addEventListener('click', () => {
        index += 1;
        update();
    });
    track.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
        if (btn?.dataset.id) onChoose(btn.dataset.id);
    });
    window.addEventListener('resize', update);
    update();
}