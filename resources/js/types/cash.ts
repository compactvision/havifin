export interface CashRegister {
    id: number;
    shop_id: number;
    counter_id: number | null;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    shop?: any; // Define Shop type if needed
    counter?: any; // Define Counter type if needed
    active_session?: CashSession;
    balances?: CashBalance[];
}

export interface CashBalance {
    id: number;
    cash_register_id: number;
    currency: string;
    amount: string; // Decimal as string
}

export interface CashSession {
    id: number;
    cash_register_id: number;
    user_id: number;
    work_session_id?: number;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at?: string;
    opening_notes?: string;
    closing_notes?: string;
    register?: CashRegister;
    work_session?: any; // You can define a WorkSession interface if needed
    amounts?: CashSessionAmount[];
    movements?: CashMovement[];
    user?: any;
}

export interface CashSessionAmount {
    id: number;
    cash_session_id: number;
    currency: string;
    opening_amount: string;
    closing_amount_theoretical?: string;
    closing_amount_real?: string;
    difference?: string;
}

export interface CashMovement {
    id: number;
    cash_session_id: number;
    transaction_id?: number;
    user_id: number;
    type: string;
    currency: string;
    amount: string;
    description?: string;
    metadata?: any;
    created_at: string;
}
