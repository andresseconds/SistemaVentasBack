import { fetchApi } from './api';

export interface Table {
    id: number;
    number: string;        // Ahora es string, como en tu DTO ("Terraza 1", "Mesa 2")
    capacity?: number;
    description?: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'; // El Enum de tu DTO
    isActive: boolean;
}

export const TablesService = {
    getAllTables: async (): Promise<Table[]> =>{
        return fetchApi('/tables');
    }
}
