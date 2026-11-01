import './scss/main.scss';
import { loadData } from './ts/api';
import { initBooking } from './ts/booking';
import { initSlider } from './ts/slider';
import { initSubscribe } from './ts/subscribe';
import { $ } from './ts/utils';

async function start(): Promise<void> {
    initSubscribe();
    try {
        const data = await loadData();

        // Користувач у шапці
        $('user-name').textContent = data.user.name;
        $<HTMLImageElement>('user-avatar').src = data.user.avatar;

        const booking = initBooking(data);
        initSlider(data.services, (id) => booking.preselectService(id));
    } catch (error) {
        console.error(error);
        $('booking').insertAdjacentHTML('afterbegin', '<p class="container placeholder">Не вдалося завантажити дані. Оновіть сторінку.</p>');
    }
}

void start();
