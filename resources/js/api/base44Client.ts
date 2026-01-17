import axios from '@/lib/axios';

// Define types for our entities
export interface ClientPhone {
    id: number;
    client_id: number;
    phone_number: string;
    is_primary: boolean;
}

export interface Client {
    id: number;
    ticket_number: string;
    phone: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    address?: string;
    is_registered: boolean;
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
    counter_number?: number;
    cashier_id?: string;
    phones?: ClientPhone[];
    full_name?: string;
    notes?: string;
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
    ticket_number?: string;
    operation_type?: string;
    service?: string;
    client_phone?: string;
}

export interface ExchangeRate {
    id: number;
    currency_from: string;
    currency_to: string;
    rate: number;
    currency_pair?: string; // Virtual property for convenience
    buy_rate?: number; // Virtual property
    sell_rate?: number; // Virtual property
}

export interface Institution {
    id: number;
    name: string;
    type: 'mobile_money' | 'bank' | 'other';
    code: string;
    logo_url?: string;
    is_active: boolean;
}

export interface Session {
    id: number;
    session_date: string;
    opened_by: number;
    closed_by?: number;
    opened_at: string;
    closed_at?: string;
    status: 'open' | 'closed';
    notes?: string;
}

export interface ExchangeRateHistory {
    id: number;
    currency_from: string;
    currency_to: string;
    rate: number;
    effective_from: string;
    effective_to?: string;
    created_by: number;
    session_id?: number;
}

export interface CashierActivity {
    id: number;
    cashier_id: number;
    session_id?: number;
    activity_type:
        | 'login'
        | 'logout'
        | 'call_client'
        | 'complete_transaction'
        | 'help_request'
        | 'recall_client';
    client_id?: number;
    description?: string;
    created_at: string;
}

export interface HelpRequest {
    id: number;
    cashier_id: number;
    client_phone: string;
    description: string;
    status: 'pending' | 'resolved';
    resolved_at?: string;
    created_at: string;
    updated_at: string;
}

export interface Advertisement {
    id: number;
    title: string;
    image_url: string;
    display_order: number;
    is_active: boolean;
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
            verifyPhone: (phone: string) =>
                axios
                    .post<{
                        exists: boolean;
                        client?: Client;
                    }>('/api/clients/verify-phone', { phone })
                    .then(handleResponse),
            register: (data: {
                phone: string;
                first_name: string;
                last_name: string;
                email?: string;
                address?: string;
            }) =>
                axios
                    .post<{
                        success: boolean;
                        client: Client;
                    }>('/api/clients/register', data)
                    .then(handleResponse),
            addPhone: (client_id: number, phone_number: string) =>
                axios
                    .post<{
                        success: boolean;
                        phone: ClientPhone;
                    }>('/api/clients/add-phone', { client_id, phone_number })
                    .then(handleResponse),
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
        Institution: {
            list: (params?: { type?: string; is_active?: boolean }) =>
                axios
                    .get<Institution[]>('/api/institutions', { params })
                    .then(handleResponse<Institution[]>),
            active: () =>
                axios
                    .get<Institution[]>('/api/institutions/active')
                    .then(handleResponse<Institution[]>),
            create: (data: Partial<Institution>) =>
                axios
                    .post<Institution>('/api/institutions', data)
                    .then(handleResponse<Institution>),
            update: (id: number, data: Partial<Institution>) =>
                axios
                    .put<Institution>(`/api/institutions/${id}`, data)
                    .then(handleResponse<Institution>),
            delete: (id: number) =>
                axios
                    .delete(`/api/institutions/${id}`)
                    .then(handleResponse<void>),
        },
        Session: {
            current: () =>
                axios
                    .get<Session | null>('/api/sessions/current')
                    .then(handleResponse),
            list: (params?: { status?: string }) =>
                axios
                    .get<Session[]>('/api/sessions', { params })
                    .then(handleResponse<Session[]>),
            create: (data: { session_date: string; notes?: string }) =>
                axios
                    .post<Session>('/api/sessions', data)
                    .then(handleResponse<Session>),
            close: (id: number) =>
                axios
                    .post<Session>(`/api/sessions/${id}/close`)
                    .then(handleResponse<Session>),
            report: (id: number) =>
                axios.get(`/api/sessions/${id}/report`).then(handleResponse),
        },
        ExchangeRateHistory: {
            list: (params?: { currency_from?: string; currency_to?: string }) =>
                axios
                    .get<
                        ExchangeRateHistory[]
                    >('/api/exchange-rate-history', { params })
                    .then(handleResponse<ExchangeRateHistory[]>),
            active: () =>
                axios
                    .get<
                        ExchangeRateHistory[]
                    >('/api/exchange-rate-history/active')
                    .then(handleResponse<ExchangeRateHistory[]>),
            create: (data: {
                currency_from: string;
                currency_to: string;
                rate: number;
                effective_from?: string;
                session_id?: number;
            }) =>
                axios
                    .post<ExchangeRateHistory>(
                        '/api/exchange-rate-history',
                        data,
                    )
                    .then(handleResponse<ExchangeRateHistory>),
            currentRate: (currency_from: string, currency_to: string) =>
                axios
                    .post<ExchangeRateHistory>(
                        '/api/exchange-rate-history/current-rate',
                        { currency_from, currency_to },
                    )
                    .then(handleResponse<ExchangeRateHistory>),
        },
        CashierActivity: {
            list: (params?: {
                cashier_id?: number;
                session_id?: number;
                start_date?: string;
                end_date?: string;
            }) =>
                axios
                    .get<
                        CashierActivity[]
                    >('/api/cashier-activities', { params })
                    .then(handleResponse<CashierActivity[]>),
            create: (data: Partial<CashierActivity>) =>
                axios
                    .post<CashierActivity>('/api/cashier-activities', data)
                    .then(handleResponse<CashierActivity>),
            stats: (params?: {
                session_id?: number;
                start_date?: string;
                end_date?: string;
            }) =>
                axios
                    .get('/api/cashier-activities/stats', { params })
                    .then(handleResponse),
        },
        HelpRequest: {
            list: (params?: { status?: string; cashier_id?: number }) =>
                axios
                    .get<HelpRequest[]>('/api/help-requests', { params })
                    .then(handleResponse<HelpRequest[]>),
            create: (data: {
                client_phone: string;
                description: string;
                cashier_id?: number;
            }) =>
                axios
                    .post<HelpRequest>('/api/help-requests', data)
                    .then(handleResponse<HelpRequest>),
            resolve: (id: number) =>
                axios
                    .post<HelpRequest>(`/api/help-requests/${id}/resolve`)
                    .then(handleResponse<HelpRequest>),
        },
        Advertisement: {
            list: () =>
                axios
                    .get<Advertisement[]>('/api/advertisements')
                    .then(handleResponse<Advertisement[]>),
            active: () =>
                axios
                    .get<Advertisement[]>('/api/advertisements/active')
                    .then(handleResponse<Advertisement[]>),
            create: (data: Partial<Advertisement>) =>
                axios
                    .post<Advertisement>('/api/advertisements', data)
                    .then(handleResponse<Advertisement>),
            update: (id: number, data: Partial<Advertisement>) =>
                axios
                    .put<Advertisement>(`/api/advertisements/${id}`, data)
                    .then(handleResponse<Advertisement>),
            delete: (id: number) =>
                axios
                    .delete(`/api/advertisements/${id}`)
                    .then(handleResponse<void>),
        },
    },
};
