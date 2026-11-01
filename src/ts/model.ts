// Модель даних
export type Gender = 'male' | 'female';

export interface Branch {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
}

export interface Service {
    id: string;
    name: string;
    duration: number; // хвилин
    price: number; // грн
    image: string;
    description: string;
    branchIds: string[];
}

export interface Doctor {
    id: string;
    name: string;
    specialty: string;
    experience: number; // років
    photo: string;
    branchIds: string[];
    serviceIds: string[];
    workDays: number[]; // 0 — неділя ... 6 — субота
}

export interface Pet {
    id: string;
    name: string;
    species: string;
    breed: string;
    gender: Gender;
    birthDate: string; // YYYY-MM-DD
    chip: string;
}

export interface TimeSlots {
    morning: string[];
    day: string[];
    evening: string[];
}

export interface ClinicData {
    city: string;
    user: { name: string; avatar: string };
    branches: Branch[];
    services: Service[];
    doctors: Doctor[];
    timeSlots: TimeSlots;
    pets: Pet[];
    species: string[];
}

export interface Appointment {
    petId: string;
    branchId: string;
    serviceIds: string[];
    doctorId: string;
    date: string; // YYYY-MM-DD
    time: string; // H:MM
    total: number;
}

// Стан форми запису та бізнес-правила
export class BookingState {
    readonly data: ClinicData;
    pets: Pet[];
    petId: string | null = null;
    branchId: string | null = null;
    serviceIds: string[] = [];
    doctorId: string | null = null;
    date: string | null = null;
    time: string | null = null;

    constructor(data: ClinicData, pets: Pet[]) {
        this.data = data;
        this.pets = pets;
    }

    get pet(): Pet | undefined {
        return this.pets.find((p) => p.id === this.petId);
    }

    get branch(): Branch | undefined {
        return this.data.branches.find((b) => b.id === this.branchId);
    }

    get doctor(): Doctor | undefined {
        return this.data.doctors.find((d) => d.id === this.doctorId);
    }

    get selectedServices(): Service[] {
        return this.data.services.filter((s) => this.serviceIds.includes(s.id));
    }

    isServiceAvailable(service: Service): boolean {
        return this.branchId !== null && service.branchIds.includes(this.branchId);
    }

    // Лікарі обраної філії, які виконують усі обрані послуги
    availableDoctors(): Doctor[] {
        const branchId = this.branchId;
        if (branchId === null || this.serviceIds.length === 0) return [];
        return this.data.doctors.filter(
            (d) => d.branchIds.includes(branchId) && this.serviceIds.every((id) => d.serviceIds.includes(id))
        );
    }

    // Орієнтовна вартість = сума цін обраних послуг
    total(): number {
        return this.selectedServices.reduce((sum, s) => sum + s.price, 0);
    }

    setBranch(id: string | null): void {
        this.branchId = id;
        this.serviceIds = this.serviceIds.filter((sid) => {
            const service = this.data.services.find((s) => s.id === sid);
            return service !== undefined && this.isServiceAvailable(service);
        });
        this.validateDoctor();
    }

    toggleService(id: string, selected: boolean): void {
        const has = this.serviceIds.includes(id);
        if (selected && !has) this.serviceIds.push(id);
        if (!selected && has) this.serviceIds = this.serviceIds.filter((sid) => sid !== id);
        this.validateDoctor();
    }

    setDoctor(id: string): void {
        if (id === this.doctorId) return;
        this.doctorId = id;
        this.date = null;
        this.time = null;
    }

    setDate(iso: string): void {
        if (iso === this.date) return;
        this.date = iso;
        this.time = null;
    }

    isComplete(): boolean {
        return (
            this.petId !== null &&
            this.branchId !== null &&
            this.serviceIds.length > 0 &&
            this.doctorId !== null &&
            this.date !== null &&
            this.time !== null
        );
    }

    reset(): void {
        this.petId = null;
        this.branchId = null;
        this.serviceIds = [];
        this.doctorId = null;
        this.date = null;
        this.time = null;
    }

    // Якщо вибраний лікар більше не підходить — скидаємо його, дату й час
    private validateDoctor(): void {
        if (this.doctorId === null) return;

        const suitable = this.availableDoctors();
        const stillSuitable = suitable.some((d) => d.id === this.doctorId);

        if (!stillSuitable) {
            this.doctorId = null;
            this.date = null;
            this.time = null;
        }
    }
}
