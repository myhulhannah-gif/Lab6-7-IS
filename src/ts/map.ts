import type { Branch } from './model';
import { $ } from './utils';
import { pin } from './icons';

// Положення міток на картинці карти
const PIN_POSITIONS: Record<string, { left: number; top: number }> = {
    center: { left: 67.1, top: 54.7 },
    south: { left: 22.5, top: 66 },
    north: { left: 85, top: 34 }
};

// Схематична карта: фонова картинка + кнопки-мітки філій
export function initBranchMap(branches: Branch[], onChoose: (id: string) => void) {
    const canvas = $('map');
    const card = $('map-card');
    const cardName = $('map-card-name');
    const cardAddress = $('map-card-address');
    const chooseBtn = $<HTMLButtonElement>('map-choose');

    let selectedId: string | null = null; // філія, обрана у формі
    let shownId = branches[0].id; // філія, показана в картці на карті

    function showCard(id: string): void {
        const branch = branches.find((b) => b.id === id);
        if (!branch) return;
        shownId = id;
        cardName.textContent = branch.name;
        cardAddress.textContent = branch.address;
        card.hidden = false;
        chooseBtn.textContent = selectedId === id ? 'Обрано' : 'Обрати';
        canvas.querySelectorAll<HTMLElement>('.map-pin').forEach((el) => el.classList.toggle('is-active', el.dataset.id === id));
    }

    chooseBtn.addEventListener('click', () => onChoose(shownId));

    // Малюємо мітки
    canvas.classList.add('is-fallback');
    for (const b of branches) {
        const position = PIN_POSITIONS[b.id];
        if (!position) continue;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'map-pin';
        btn.dataset.id = b.id;
        btn.setAttribute('aria-label', `${b.name}, ${b.address}`);
        btn.style.left = `${position.left}%`;
        btn.style.top = `${position.top}%`;
        btn.innerHTML = pin;
        btn.addEventListener('click', () => showCard(b.id));
        canvas.append(btn);
    }
    showCard(shownId);

    return {
        // Викликається, коли філію обрали у списку або кнопкою «Обрати» на карті
        setSelected(id: string | null): void {
            selectedId = id;
            showCard(id ?? shownId);
        }
    };
}