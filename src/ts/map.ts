import type { Branch } from './model';
import { $ } from './utils';
import { pin } from './icons';

export interface BranchMap {
    activate(): void; // викликається, коли вкладка «На карті» стала видимою
    setSelected(id: string | null): void;
}

// Ручне уточнення положення міток (у % від карти), щоб вони не стояли на дорогах картинки
const PIN_OVERRIDES: Record<string, { left: number; top: number }> = {
    south: { left: 22.5, top: 66 }
};

// Схематична карта: фонова картинка + кнопки-мітки філій
export function initBranchMap(branches: Branch[], onChoose: (id: string) => void): BranchMap {
    const canvas = $('map');
    const card = $('map-card');
    const cardName = $('map-card-name');
    const cardAddress = $('map-card-address');
    const chooseBtn = $<HTMLButtonElement>('map-choose');

    let selectedId: string | null = null;
    let shownId: string | null = null;
    let started = false;
    const pins = new Map<string, HTMLButtonElement>();

    // Підсвічує мітку філії, яка показана в картці
    function paint(): void {
        const active = shownId ?? selectedId;
        for (const [id, el] of pins) el.classList.toggle('is-active', id === active);
    }

    // Показує картку внизу карти з назвою та адресою філії
    function showCard(id: string): void {
        const branch = branches.find((b) => b.id === id);
        if (!branch) return;
        shownId = id;
        cardName.textContent = branch.name;
        cardAddress.textContent = branch.address;
        card.hidden = false;
        chooseBtn.textContent = selectedId === id ? 'Обрано' : 'Обрати';
        paint();
    }

    chooseBtn.addEventListener('click', () => {
        if (shownId) onChoose(shownId);
    });

    // Розставляє мітки за координатами філій
    function render(): void {
        canvas.classList.add('is-fallback');

        const lats = branches.map((b) => b.lat);
        const lngs = branches.map((b) => b.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const scale = (v: number, min: number, max: number) => (max === min ? 0.5 : (v - min) / (max - min));

        for (const b of branches) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'map-pin';
            btn.setAttribute('aria-label', `${b.name}, ${b.address}`);
            const custom = PIN_OVERRIDES[b.id];
            btn.style.left = `${custom?.left ?? 15 + 70 * scale(b.lng, minLng, maxLng)}%`;
            btn.style.top = `${custom?.top ?? 34 + 34 * (1 - scale(b.lat, minLat, maxLat))}%`;
            btn.innerHTML = pin;
            btn.addEventListener('click', () => showCard(b.id));
            canvas.append(btn);
            pins.set(b.id, btn);
        }
    }

    return {
        activate() {
            if (started) return;
            started = true;
            render();
            showCard(selectedId ?? branches[0].id);
        },
        setSelected(id) {
            selectedId = id;
            if (started) showCard(id ?? shownId ?? branches[0].id);
        }
    };
}