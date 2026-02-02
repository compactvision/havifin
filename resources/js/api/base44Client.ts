import axios from '@/lib/axios';
import { CashMovement, CashRegister, CashSession } from '@/types/cash';

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
    exchange_rate?: number;
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
    client_name?: string;
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
    type: 'mobile_money' | 'bank' | 'payment' | 'other';
    code: string;
    logo_url?: string;
    is_active: boolean;
    settings?: {
        required_fields: string[];
        withdrawal_agent_name?: string;
        withdrawal_agent_number?: string;
        custom_fields?: {
            id: string;
            label: string;
            type: string;
            operation_type?: 'depot' | 'retrait' | 'both';
        }[];
    };
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
    shop_id: number;
    shop?: Shop;
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
    type: 'image' | 'video';
    image_url: string;
    display_order: number;
    is_active: boolean;
}

export interface News {
    id: number;
    content: string;
    is_active: boolean;
    display_order: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'cashier' | 'manager' | 'super-admin' | 'client';
    is_active: boolean;
    shops?: Shop[];
}

export interface Shop {
    id: number;
    name: string;
    slug: string;
    address?: string;
    counter_count: number;
    is_active: boolean;
    users?: User[];
}

export interface Counter {
    id: number;
    shop_id: number;
    counter_number: number;
    name: string;
    cashier_id?: number;
    cashier?: User;
    is_active: boolean;
}

export interface PaginatedResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
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
            list: (params?: {
                status?: string;
                shop_id?: string;
                date?: string;
                page?: string;
            }) =>
                axios
                    .get<
                        PaginatedResponse<Session>
                    >('/api/sessions', { params })
                    .then(handleResponse<PaginatedResponse<Session>>),
            create: (data: {
                session_date: string;
                shop_id: number;
                notes?: string;
            }) =>
                axios
                    .post<Session>('/api/sessions', data)
                    .then(handleResponse<Session>),
            close: (id: number) =>
                axios
                    .post<Session>(`/api/sessions/${id}/close`)
                    .then(handleResponse<Session>),
            reopen: (id: number) =>
                axios
                    .post<Session>(`/api/sessions/${id}/reopen`)
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
        News: {
            list: () =>
                axios.get<News[]>('/api/news').then(handleResponse<News[]>),
            active: () =>
                axios
                    .get<News[]>('/api/news/active')
                    .then(handleResponse<News[]>),
            create: (data: Partial<News>) =>
                axios.post<News>('/api/news', data).then(handleResponse<News>),
            update: (id: number, data: Partial<News>) =>
                axios
                    .put<News>(`/api/news/${id}`, data)
                    .then(handleResponse<News>),
            delete: (id: number) =>
                axios.delete(`/api/news/${id}`).then(handleResponse<void>),
        },
        User: {
            list: () =>
                axios.get<User[]>('/api/users').then(handleResponse<User[]>),
            create: (data: Partial<User>) =>
                axios.post<User>('/api/users', data).then(handleResponse<User>),
            update: (id: number, data: Partial<User>) =>
                axios
                    .put<User>(`/api/users/${id}`, data)
                    .then(handleResponse<User>),
            delete: (id: number) =>
                axios.delete(`/api/users/${id}`).then(handleResponse<void>),
        },
        Shop: {
            list: () =>
                axios.get<Shop[]>('/api/shops').then(handleResponse<Shop[]>),
            create: (data: Partial<Shop> & { user_ids?: number[] }) =>
                axios.post<Shop>('/api/shops', data).then(handleResponse<Shop>),
            update: (
                id: number,
                data: Partial<Shop> & { user_ids?: number[] },
            ) =>
                axios
                    .put<Shop>(`/api/shops/${id}`, data)
                    .then(handleResponse<Shop>),
            delete: (id: number) =>
                axios.delete(`/api/shops/${id}`).then(handleResponse<void>),
            assignUsers: (id: number, user_ids: number[]) =>
                axios
                    .post<Shop>(`/api/shops/${id}/assign-users`, { user_ids })
                    .then(handleResponse<Shop>),
        },
        Counter: {
            list: (shopId: number) =>
                axios
                    .get<Counter[]>(`/api/shops/${shopId}/counters`)
                    .then(handleResponse<Counter[]>),
            create: (shopId: number, data: Partial<Counter>) =>
                axios
                    .post<Counter>(`/api/shops/${shopId}/counters`, data)
                    .then(handleResponse<Counter>),
            update: (id: number, data: Partial<Counter>) =>
                axios
                    .put<Counter>(`/api/counters/${id}`, data)
                    .then(handleResponse<Counter>),
            delete: (id: number) =>
                axios.delete(`/api/counters/${id}`).then(handleResponse<void>),
        },
        CashRegister: {
            list: () =>
                axios
                    .get<CashRegister[]>('/api/cash/registers')
                    .then(handleResponse<CashRegister[]>),
            create: (data: Partial<CashRegister>) =>
                axios
                    .post<CashRegister>('/api/cash/registers', data)
                    .then(handleResponse<CashRegister>),
            show: (id: number) =>
                axios
                    .get<CashRegister>(`/api/cash/registers/${id}`)
                    .then(handleResponse<CashRegister>),
        },
        CashSession: {
            current: () =>
                axios
                    .get<CashSession | null>('/api/cash/sessions/current')
                    .then(handleResponse<CashSession | null>),
            list: (params?: any) =>
                axios
                    .get<CashSession[]>('/api/cash/sessions', { params })
                    .then(handleResponse<CashSession[]>),
            show: (id: number | string) =>
                axios
                    .get<CashSession>(`/api/cash/sessions/${id}`)
                    .then(handleResponse<CashSession>),
            create: (data: any) =>
                axios
                    .post<CashSession>('/api/cash/sessions', data)
                    .then(handleResponse<CashSession>),
            close: (id: number | string, data: any) =>
                axios
                    .post<CashSession>(`/api/cash/sessions/${id}/close`, data)
                    .then(handleResponse<CashSession>),
            movements: (id: number | string) =>
                axios
                    .get<{
                        data: CashMovement[];
                    }>(`/api/cash/sessions/${id}/movements`)
                    .then(handleResponse),
            report: (id: number | string) =>
                axios
                    .get<any>(`/api/cash/sessions/${id}/report`)
                    .then(handleResponse<any>),
        },
        CashMovement: {
            store: (data: any) =>
                axios
                    .post<CashMovement>('/api/cash/movements', data)
                    .then(handleResponse<CashMovement>),
        },
    },
};
