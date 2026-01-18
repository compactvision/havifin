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
            const response = await fetch('/api/users', {
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            return await response.json();
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    createUser: async (user: CreateUserPayload): Promise<User> => {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(user),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.errors) {
                    throw new Error(
                        Object.values(data.errors).flat().join('\n'),
                    );
                }
                throw new Error(data.message || 'Failed to create user');
            }

            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    updateUser: async (
        id: number,
        user: Partial<CreateUserPayload>,
    ): Promise<User> => {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(user),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.errors) {
                    throw new Error(
                        Object.values(data.errors).flat().join('\n'),
                    );
                }
                throw new Error(data.message || 'Failed to update user');
            }

            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    deleteUser: async (id: number): Promise<void> => {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to delete user');
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },
};
