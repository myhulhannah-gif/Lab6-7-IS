import type { Gender, Pet } from './model';
import { $, toISO } from './utils';

// Валідація форми «Нова тварина»: кожна помилка містить причину і підказку (вимога ЛР3)
type Fields = { name: string; species: string; breed: string; birthDate: string; chip: string };

const MAX_PET_AGE_YEARS = 40; // старше за 40 років тварина бути не може

// Межі для дати народження: не раніше ніж 40 років тому і не пізніше сьогодні
function dateLimits(): { min: string; max: string } {
    const now = new Date();
    const oldest = new Date(now.getFullYear() - MAX_PET_AGE_YEARS, now.getMonth(), now.getDate());
    return { min: toISO(oldest), max: toISO(now) };
}

function validate(values: Fields): Partial<Record<keyof Fields, string>> {
    const errors: Partial<Record<keyof Fields, string>> = {};
    const { min, max } = dateLimits();

    if (!values.name) errors.name = 'Вкажіть кличку тварини, наприклад: Рекс.';
    else if (values.name.length < 2 || values.name.length > 30) errors.name = 'Кличка має містити від 2 до 30 символів.';
    else if (!/^[\p{L}0-9'’\-\s]+$/u.test(values.name)) errors.name = 'Кличка може містити лише літери, цифри, пробіл і дефіс.';

    if (!values.species) errors.species = 'Оберіть вид тварини зі списку.';

    if (!values.breed) errors.breed = 'Вкажіть породу. Для безпородної тварини напишіть «Безпородна».';
    else if (values.breed.length < 2 || values.breed.length > 40) errors.breed = 'Назва породи має містити від 2 до 40 символів.';

    if (!values.birthDate) errors.birthDate = 'Вкажіть дату народження (орієнтовну, якщо точна невідома).';
    else if (values.birthDate > max) errors.birthDate = 'Дата народження не може бути в майбутньому.';
    else if (values.birthDate < min) errors.birthDate = `Перевірте рік народження: тварина не може бути старшою за ${MAX_PET_AGE_YEARS} років.`;

    if (values.chip && !/^\d{15}$/.test(values.chip)) errors.chip = 'Номер чипа складається рівно з 15 цифр, без пробілів і літер.';

    return errors;
}

export function initPetForm(species: string[], onSave: (pet: Pet) => void): void {
    const dialog = $<HTMLDialogElement>('pet-modal');
    const form = $<HTMLFormElement>('pet-form');
    const speciesSelect = $<HTMLSelectElement>('pet-species');
    const birthInput = $<HTMLInputElement>('pet-birth');

    speciesSelect.insertAdjacentHTML('beforeend', species.map((s) => `<option value="${s}">${s}</option>`).join(''));

    const read = (): Fields => {
        const data = new FormData(form);
        const text = (key: string) => String(data.get(key) ?? '').trim();
        return { name: text('name'), species: text('species'), breed: text('breed'), birthDate: text('birthDate'), chip: text('chip').replace(/\s+/g, '') };
    };

    function showErrors(errors: Partial<Record<keyof Fields, string>>): void {
        form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((p) => {
            const key = p.dataset.errorFor as keyof Fields;
            p.textContent = errors[key] ?? '';
            const input = form.elements.namedItem(key) as HTMLElement | null;
            input?.classList.toggle('is-invalid', Boolean(errors[key]));
        });
    }

    $('new-pet-btn').addEventListener('click', () => {
        form.reset();
        const { min, max } = dateLimits();
        birthInput.min = min;
        birthInput.max = max;
        showErrors({});
        dialog.showModal();
    });
    $('pet-cancel').addEventListener('click', () => dialog.close());

    // Клік по затемненню закриває вікно
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });

    // Помилка зникає, щойно користувач починає її виправляти
    form.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const err = form.querySelector<HTMLElement>(`[data-error-for="${target.name}"]`);
        if (err?.textContent) {
            err.textContent = '';
            target.classList.remove('is-invalid');
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const values = read();
        const errors = validate(values);
        showErrors(errors);
        const firstInvalid = form.querySelector<HTMLElement>('.is-invalid');
        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }
        onSave({
            id: `pet-${Date.now()}`,
            name: values.name,
            species: values.species,
            breed: values.breed,
            gender: (new FormData(form).get('gender') as Gender) ?? 'male',
            birthDate: values.birthDate,
            chip: values.chip
        });
        dialog.close();
    });
}
