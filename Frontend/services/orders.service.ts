import { fetchApi } from './api';

export const OrdersService = {
    createOrder: async (orderData: any) => {
        return fetchApi('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    },

    checkoutTable: async (tableId: number) => {
        return fetchApi(`/orders/checkout/${tableId}`,{
            method: 'PATCH',
        });
    }
};