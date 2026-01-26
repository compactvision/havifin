import axios from '@/lib/axios';

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateUserPayload {
    name: string;
    email: string;
    password?: string;
    role: 'manager' | 'cashier' | 'client';
    is_active: boolean;
}

export const authClient = {
    // User Management
    getUsers: async (): Promise<User[]> => {
        try {
            const response = await axios.get<User[]>('/api/users');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    createUser: async (user: CreateUserPayload): Promise<User> => {
        try {
            const response = await axios.post<User>('/api/users', user);
            return response.data;
        } catch (error: any) {
            console.error('Error creating user:', error);
            if (error.response?.data?.errors) {
                throw new Error(
                    Object.values(error.response.data.errors).flat().join('\n'),
                );
            }
            throw new Error(
                error.response?.data?.message || 'Failed to create user',
            );
        }
    },

    updateUser: async (
        id: number,
        user: Partial<CreateUserPayload>,
    ): Promise<User> => {
        try {
            const response = await axios.put<User>(`/api/users/${id}`, user);
            return response.data;
        } catch (error: any) {
            console.error('Error updating user:', error);
            if (error.response?.data?.errors) {
                throw new Error(
                    Object.values(error.response.data.errors).flat().join('\n'),
                );
            }
            throw new Error(
                error.response?.data?.message || 'Failed to update user',
            );
        }
    },

    deleteUser: async (id: number): Promise<void> => {
        try {
            await axios.delete(`/api/users/${id}`);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },
};
