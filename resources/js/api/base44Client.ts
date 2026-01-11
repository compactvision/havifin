import axios from '@/lib/axios';

// Define types for our entities
export interface Client {
    id: number;
    ticket_number: string;
    phone: string;
    operation_type: string;
    service: string;
    currency_from?: string;
    currency_to?: string;
    amount?: number;
    amount_from?: number;
    status: string;
    created_date: string;
    called_at?: string;
    completed_at?: string;
    commission?: number;
}

export interface Transaction {
    id: number;
    amount_from: number;
    amount_to: number;
    currency_from: string;
    currency_to: string;
    exchange_rate: number;
    commission: number;
    created_date: string;
    client_id: number;
}

export interface ExchangeRate {
    id: number;
    currency_from: string;
    currency_to: string;
    rate: number;
}

const handleResponse = <T>(response: any): T => response.data;

export const base44 = {
    entities: {
        Client: {
            create: (data: Partial<Client>) =>
                axios
                    .post<Client>('/api/clients', data)
                    .then(handleResponse<Client>),
            update: (id: number, data: Partial<Client>) =>
                axios
                    .put<Client>(`/api/clients/${id}`, data)
                    .then(handleResponse<Client>),
            list: (sort?: string, limit?: number) =>
                axios
                    .get<Client[]>('/api/clients', { params: { sort, limit } })
                    .then(handleResponse<Client[]>),
            filter: (params: Partial<Client>, sort?: string, limit?: number) =>
                axios
                    .get<
                        Client[]
                    >('/api/clients', { params: { ...params, sort, limit } })
                    .then(handleResponse<Client[]>),
        },
        Transaction: {
            create: (data: Partial<Transaction>) =>
                axios
                    .post<Transaction>('/api/transactions', data)
                    .then(handleResponse<Transaction>),
            list: (sort?: string, limit?: number) =>
                axios
                    .get<
                        Transaction[]
                    >('/api/transactions', { params: { sort, limit } })
                    .then(handleResponse<Transaction[]>),
        },
        ExchangeRate: {
            getAll: () =>
                axios
                    .get<ExchangeRate[]>('/api/exchange-rates')
                    .then(handleResponse<ExchangeRate[]>),
            create: (data: Partial<ExchangeRate>) =>
                axios
                    .post<ExchangeRate>('/api/exchange-rates', data)
                    .then(handleResponse<ExchangeRate>),
            update: (id: number, data: Partial<ExchangeRate>) =>
                axios
                    .put<ExchangeRate>(`/api/exchange-rates/${id}`, data)
                    .then(handleResponse<ExchangeRate>),
            delete: (id: number) =>
                axios
                    .delete(`/api/exchange-rates/${id}`)
                    .then(handleResponse<void>),
            filter: (
                params: Partial<ExchangeRate>,
                sort?: string,
                limit?: number,
            ) =>
                axios
                    .get<ExchangeRate[]>('/api/exchange-rates', {
                        params: { ...params, sort, limit },
                    })
                    .then(handleResponse<ExchangeRate[]>),
        },
    },
};
