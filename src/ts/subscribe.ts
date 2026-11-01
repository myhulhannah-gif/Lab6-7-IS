import { $ } from './utils';

const HIDE_AFTER_MS = 5000; // через скільки мілісекунд зникає підтвердження

// Форма підписки на нагадування про щеплення у підвалі
export function initSubscribe(): void {
    const form = $<HTMLFormElement>('subscribe-form');
    const input = $<HTMLInputElement>('subscribe-email');
    const msg = $('subscribe-msg');
    let timer: number | undefined;

    function clearMessage(): void {
        window.clearTimeout(timer);
        msg.textContent = '';
        msg.classList.remove('is-error');
        input.classList.remove('is-invalid');
    }

    function showMessage(text: string, isError: boolean): void {
        window.clearTimeout(timer);
        msg.textContent = text;
        msg.classList.toggle('is-error', isError);
        input.classList.toggle('is-invalid', isError);
        // Підтвердження зникає саме, а помилка лишається, поки її не почнуть виправляти
        if (!isError) timer = window.setTimeout(clearMessage, HIDE_AFTER_MS);
    }

    input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) clearMessage();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = input.value.trim();
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        if (valid) {
            showMessage(`Дякуємо! Нагадування про щеплення надходитимуть на ${email}.`, false);
            form.reset();
        } else {
            showMessage('Вкажіть коректну адресу, наприклад: name@example.com.', true);
        }
    });
}