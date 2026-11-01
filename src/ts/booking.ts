import { BookingState } from './model';
import type { Appointment, ClinicData, Pet } from './model';
import { saveAppointment } from './api';
import { initBranchMap } from './map';
import { initPetForm } from './pet-form';
import { createDateTimePicker } from './datetime';
import { chevronRight } from './icons';
import { $, formatDateLong, formatPrice, placeholder } from './utils';

// Форма запису на прийом: п'ять кроків + картка «Ваш запис»
export function initBooking(data: ClinicData) {
    const state = new BookingState(data, [...data.pets]);
    let pendingServiceId: string | null = null;

    const petPicker = $('pet-picker');
    const petToggle = $<HTMLButtonElement>('pet-toggle');
    const petToggleText = $('pet-toggle-text');
    const petList = $('pet-list');
    const deleteModal = $<HTMLDialogElement>('delete-pet-modal');
    const branchList = $('branch-list');
    const servicesBox = $('services-box');
    const doctorBox = $('doctor-box');
    const datetimeBox = $('datetime-box');
    const confirmBtn = $<HTMLButtonElement>('confirm-btn');
    const successModal = $<HTMLDialogElement>('success-modal');

    const map = initBranchMap(data.branches, (id) => selectBranch(id));
    const picker = createDateTimePicker(datetimeBox, state, renderSummary);

    // 1. Тварина
    function renderPets(): void {
        const pet = state.pet;
        petToggleText.textContent = pet ? `${pet.name} (${pet.species.toLowerCase()})` : 'Оберіть тварину';
        petList.innerHTML =
            state.pets.length === 0
                ? '<li class="pet-picker__empty">Тварин ще немає. Додайте першу.</li>'
                : state.pets
                    .map(
                        (p) => `<li class="pet-picker__item${p.id === state.petId ? ' is-selected' : ''}" role="option" aria-selected="${p.id === state.petId}">
                    <button type="button" class="pet-picker__choose" data-choose="${p.id}">${p.name} (${p.species.toLowerCase()})</button>
                    <button type="button" class="pet-picker__remove" data-remove="${p.id}" aria-label="Видалити ${p.name}">×</button>
                </li>`
                    )
                    .join('');
    }

    function setPetListOpen(open: boolean): void {
        petList.hidden = !open;
        petToggle.setAttribute('aria-expanded', String(open));
    }

    petToggle.addEventListener('click', () => setPetListOpen(petList.hasAttribute('hidden')));
    // Клік поза списком закриває його
    document.addEventListener('click', (e) => {
        if (!petPicker.contains(e.target as Node)) setPetListOpen(false);
    });

    petList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const choose = target.closest<HTMLElement>('[data-choose]');
        const remove = target.closest<HTMLElement>('[data-remove]');
        if (choose) {
            state.petId = choose.dataset.choose ?? null;
            setPetListOpen(false);
            renderPets();
            renderSummary();
        } else if (remove?.dataset.remove) {
            askDeletePet(remove.dataset.remove);
        }
    });

    // Видалення профілю тварини з підтвердженням
    let petToDelete: string | null = null;

    function askDeletePet(id: string): void {
        const pet = state.pets.find((p) => p.id === id);
        if (!pet) return;
        petToDelete = id;
        $('delete-pet-text').textContent = `Ви впевнені, що хочете видалити профіль тварини «${pet.name}»? Цю дію не можна скасувати.`;
        setPetListOpen(false);
        deleteModal.showModal();
    }

    $('delete-pet-cancel').addEventListener('click', () => deleteModal.close());
    $('delete-pet-confirm').addEventListener('click', () => {
        state.pets = state.pets.filter((p) => p.id !== petToDelete);
        if (state.petId === petToDelete) state.petId = null;
        petToDelete = null;
        deleteModal.close();
        renderPets();
        renderSummary();
    });

    initPetForm(data.species, (pet: Pet) => {
        state.pets.push(pet);
        state.petId = pet.id;
        renderPets();
        renderSummary();
    });

    // 2. Філія
    function renderBranches(): void {
        branchList.innerHTML = data.branches
            .map((b) => {
                const selected = b.id === state.branchId;
                return `<li><button type="button" class="branch-item${selected ? ' is-selected' : ''}" data-id="${b.id}" aria-pressed="${selected}">
                    <span class="branch-item__thumb"></span>
                    <span class="branch-item__text"><strong>${b.name}</strong><span>${b.address}</span></span>
                    ${chevronRight}
                </button></li>`;
            })
            .join('');
    }

    branchList.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('.branch-item');
        if (btn?.dataset.id) selectBranch(btn.dataset.id);
    });

    function selectBranch(id: string | null): void {
        state.setBranch(id);
        // Послуга, обрана на слайдері до вибору філії, додається, якщо вона доступна у філії
        if (id && pendingServiceId) {
            const service = data.services.find((s) => s.id === pendingServiceId);
            if (service && state.isServiceAvailable(service)) state.toggleService(service.id, true);
            pendingServiceId = null;
        }
        map.setSelected(id);
        renderBranches();
        renderServices();
        renderDoctors();
        renderDateTime();
        renderSummary();
    }

    // Вкладки «Список» / «На карті»
    const tabList = $('tab-list');
    const tabMap = $('tab-map');
    const mapPanel = $('branch-map-panel');
    function setTab(tab: 'list' | 'map'): void {
        const isMap = tab === 'map';
        tabList.classList.toggle('is-active', !isMap);
        tabMap.classList.toggle('is-active', isMap);
        tabList.setAttribute('aria-selected', String(!isMap));
        tabMap.setAttribute('aria-selected', String(isMap));
        branchList.hidden = isMap;
        mapPanel.hidden = !isMap;
    }
    tabList.addEventListener('click', () => setTab('list'));
    tabMap.addEventListener('click', () => setTab('map'));

    // 3. Послуги
    function renderServices(): void {
        if (!state.branchId) {
            servicesBox.innerHTML = placeholder('Спочатку оберіть філію');
            return;
        }
        // Доступні послуги — зверху, недоступні у цій філії — внизу
        const items = [...data.services].sort((a, b) => Number(!state.isServiceAvailable(a)) - Number(!state.isServiceAvailable(b)));
        servicesBox.innerHTML = `<ul class="service-list">${items
            .map((s) => {
                const ok = state.isServiceAvailable(s);
                const checked = state.serviceIds.includes(s.id) ? 'checked' : '';
                return `<li class="service-row${ok ? '' : ' is-disabled'}">
                    <input class="service-row__input" type="checkbox" id="svc-${s.id}" data-id="${s.id}" ${checked} ${ok ? '' : 'disabled'}>
                    <label class="service-row__name" for="svc-${s.id}">${s.name}</label>
                    ${ok ? `<span class="service-row__price">${formatPrice(s.price)}</span>` : ''}
                    <p class="service-row__desc"${ok ? ` data-full="${s.duration} хв · ${s.description}"` : ''}>${ok ? '' : 'Недоступно в цій філії'}</p>
                </li>`;
            })
            .join('')}</ul>`;
        requestAnimationFrame(refreshDescriptions);
    }

    // Кнопка «ще» потрібна лише тоді, коли опис не вміщується в один рядок
    function fitDescription(desc: HTMLElement): void {
        const full = desc.dataset.full;
        if (!full) return;
        const expanded = desc.dataset.expanded === 'true';
        desc.classList.toggle('is-expanded', expanded);

        const text = document.createElement('span');
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'service-row__more';
        more.dataset.more = '';
        desc.replaceChildren(text);
        text.textContent = full;

        if (expanded) {
            more.textContent = 'згорнути';
            desc.append(more);
            return;
        }
        if (desc.scrollWidth <= desc.clientWidth) return; // увесь текст вмістився, кнопка не потрібна

        more.textContent = 'ще';
        desc.append(more);
        // Підбираємо найдовшу частину тексту, яка вміщується разом із «… ще»
        let low = 0;
        let high = full.length;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            text.textContent = `${full.slice(0, mid).trimEnd()}…`;
            if (desc.scrollWidth <= desc.clientWidth) low = mid;
            else high = mid - 1;
        }
        text.textContent = `${full.slice(0, low).trimEnd()}…`;
    }

    function refreshDescriptions(): void {
        servicesBox.querySelectorAll<HTMLElement>('.service-row__desc').forEach(fitDescription);
    }
    window.addEventListener('resize', refreshDescriptions);
    void document.fonts?.ready.then(refreshDescriptions); // після завантаження шрифту ширина тексту змінюється

    servicesBox.addEventListener('click', (e) => {
        const more = (e.target as HTMLElement).closest<HTMLElement>('[data-more]');
        const desc = more?.closest<HTMLElement>('.service-row__desc');
        if (!desc) return;
        desc.dataset.expanded = String(desc.dataset.expanded !== 'true');
        fitDescription(desc);
    });

    servicesBox.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        if (!input.dataset.id) return;
        state.toggleService(input.dataset.id, input.checked);
        renderDoctors();
        renderDateTime();
        renderSummary();
    });

    // 4. Лікар
    function renderDoctors(): void {
        if (!state.branchId || state.serviceIds.length === 0) {
            doctorBox.innerHTML = placeholder('Спочатку оберіть філію та послуги');
            return;
        }
        const doctors = state.availableDoctors();
        if (doctors.length === 0) {
            doctorBox.innerHTML = placeholder('У цій філії немає лікаря, який виконує всі обрані послуги. Змініть вибір послуг.');
            return;
        }
        doctorBox.innerHTML = `<div class="doctor-list">${doctors
            .map((d) => {
                const selected = d.id === state.doctorId;
                return `<button type="button" class="doctor-card${selected ? ' is-selected' : ''}" data-id="${d.id}" aria-pressed="${selected}">
                    <img class="doctor-card__photo" src="${d.photo}" alt="">
                    <span class="doctor-card__text">
                        <strong>${d.name}</strong>
                        <span>${d.specialty} · стаж ${d.experience} р.</span>
                    </span>
                </button>`;
            })
            .join('')}</div>`;
    }

    doctorBox.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>('.doctor-card');
        if (!card?.dataset.id) return;
        state.setDoctor(card.dataset.id);
        renderDoctors();
        renderDateTime();
        renderSummary();
    });

    // 5. Дата та час
    function renderDateTime(): void {
        if (!state.doctor) {
            datetimeBox.innerHTML = placeholder('Спочатку оберіть лікаря');
            return;
        }
        picker.render();
    }

    // Картка «Ваш запис» + розрахунок вартості
    function setValue(id: string, text: string | null): void {
        const el = $(id);
        el.textContent = text ?? 'Не обрано';
        el.classList.toggle('is-empty', text === null);
    }

    function renderSummary(): void {
        setValue('sum-pet', state.pet?.name ?? null);
        setValue('sum-branch', state.branch?.name ?? null);
        setValue('sum-doctor', state.doctor?.name ?? null);
        setValue('sum-date', state.date ? formatDateLong(state.date) : null);
        setValue('sum-time', state.time);

        const services = state.selectedServices;
        const sumServices = $('sum-services');
        if (services.length === 0) {
            setValue('sum-services', null);
        } else {
            sumServices.classList.remove('is-empty');
            sumServices.innerHTML = `<ul class="summary__services">${services.map((s) => `<li><span>${s.name}</span><span>${formatPrice(s.price)}</span></li>`).join('')}</ul>`;
        }

        $('sum-total').textContent = formatPrice(state.total());
        confirmBtn.disabled = !state.isComplete();
    }

    // Підтвердження запису
    confirmBtn.addEventListener('click', () => {
        if (!state.isComplete()) return;
        const { pet, branch, doctor, date, time } = state;
        if (!pet || !branch || !doctor || !date || !time) return;

        const appointment: Appointment = { petId: pet.id, branchId: branch.id, serviceIds: [...state.serviceIds], doctorId: doctor.id, date, time, total: state.total() };
        saveAppointment(appointment);

        const names = state.selectedServices.map((s) => s.name).join(', ');
        const rows: [string, string][] = [
            ['Тварина', pet.name],
            ['Філія', `${branch.name}, ${branch.address}`],
            ['Послуги', names],
            ['Лікар', doctor.name],
            ['Дата', formatDateLong(date)],
            ['Час', time],
            ['Орієнтовна вартість', formatPrice(appointment.total)]
        ];
        $('success-list').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

        successModal.showModal();
    });

    $('success-close').addEventListener('click', () => successModal.close());
    // Після закриття повідомлення форма повертається у початковий стан
    successModal.addEventListener('close', () => {
        state.reset();
        map.setSelected(null);
        setTab('list');
        renderAll();
    });

    function renderAll(): void {
        renderPets();
        renderBranches();
        renderServices();
        renderDoctors();
        renderDateTime();
        renderSummary();
    }

    $('city-name').textContent = data.city;
    renderAll();

    return {
        // Кнопка «Обрати» на слайдері послуг
        preselectService(id: string): void {
            const service = data.services.find((s) => s.id === id);
            if (!service) return;
            if (state.branchId) {
                if (state.isServiceAvailable(service)) {
                    state.toggleService(id, true);
                    renderServices();
                    renderDoctors();
                    renderDateTime();
                    renderSummary();
                }
            } else {
                pendingServiceId = id;
            }
            const target = document.getElementById(state.branchId ? 'step-services' : 'step-branch');
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
}