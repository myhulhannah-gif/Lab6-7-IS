import type { Appointment, ClinicData } from './model';

const appointments: Appointment[] = [];

export async function loadData(): Promise<ClinicData> {
    const response = await fetch('/data.json');
    if (!response.ok) throw new Error('Не вдалося завантажити дані');
    return await response.json();
}

export function saveAppointment(appointment: Appointment): void {
    appointments.push(appointment);
}

// Вільнй чи зайнятий часовий слот у лікаря
export function isSlotBusy(doctorId: string, date: string, time: string): boolean {
    const saved = appointments.some((a) => a.doctorId === doctorId && a.date === date && a.time === time); // чи створено уже такий самий запис
    const day = Number(date.slice(8));
    const hour = Number(time.split(':')[0]);
    const busyInClinic = (day + hour + doctorId.length) % 4 === 0;
    return saved || busyInClinic;
}