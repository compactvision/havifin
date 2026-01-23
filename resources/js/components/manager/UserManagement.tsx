import { type CreateUserPayload, type User } from '@/api/authClient';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Edit,
    Plus,
    Shield,
    ShieldCheck,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function UserManagement() {
    const { auth } = usePage().props as any;
    const isSuperAdmin = auth.user?.role === 'super-admin';
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<
        CreateUserPayload & { shop_ids?: number[] }
    >({
        name: '',
        email: '',
        password: '',
        role: isSuperAdmin ? 'manager' : 'cashier',
        is_active: true,
        shop_ids: [],
    });

    // Fetch shops for assignment (Super Admin only)
    const { data: allShops } = useQuery({
        queryKey: ['shops'],
        queryFn: base44.entities.Shop.list,
        enabled: isSuperAdmin,
    });

    // Fetch users
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: base44.entities.User.list,
    });

    // Create user mutation
    const createMutation = useMutation({
        mutationFn: base44.entities.User.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsCreateModalOpen(false);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'cashier',
                is_active: true,
            });
            toast.success('Utilisateur créé avec succès');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erreur lors de la création');
        },
    });

    // Update user mutation
    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: Partial<CreateUserPayload>;
        }) => base44.entities.User.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'cashier',
                is_active: true,
            });
            toast.success('Utilisateur mis à jour avec succès');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erreur lors de la mise à jour');
        },
    });

    // Delete user mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => base44.entities.User.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Utilisateur supprimé avec succès');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erreur lors de la suppression');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateMutation.mutate({ id: editingUser.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role as any,
            is_active: user.is_active,
        });
        setIsCreateModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            deleteMutation.mutate(id);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'manager':
                return (
                    <Badge className="bg-purple-500 hover:bg-purple-600">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Manager
                    </Badge>
                );
            case 'cashier':
                return (
                    <Badge className="bg-pink-500 hover:bg-pink-600">
                        <Shield className="mr-1 h-3 w-3" /> Caissier
                    </Badge>
                );
            case 'client':
                return (
                    <Badge className="bg-cyan-500 hover:bg-cyan-600">
                        <UserIcon className="mr-1 h-3 w-3" /> Client
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{role}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Gestion des utilisateurs
                    </h2>
                    <p className="text-slate-500">
                        Gérez les accès et les rôles des utilisateurs
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({
                            name: '',
                            email: '',
                            password: '',
                            role: isSuperAdmin ? 'manager' : 'cashier',
                            is_active: true,
                        });
                        setIsCreateModalOpen(true);
                    }}
                    className="bg-[#1f61e4] hover:bg-[#1f61e4]/90"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    {isSuperAdmin ? 'Nouvel utilisateur' : 'Nouveau Caissier'}
                </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Boutique</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-24 text-center"
                                >
                                    Chargement...
                                </TableCell>
                            </TableRow>
                        ) : (
                            (users as User[])?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {user.name}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {(user as any).shops &&
                                            (user as any).shops.length > 0 ? (
                                                (user as any).shops.map(
                                                    (shop: any) => (
                                                        <Badge
                                                            key={shop.id}
                                                            variant="outline"
                                                            className="py-0 text-[10px]"
                                                        >
                                                            {shop.name}
                                                        </Badge>
                                                    ),
                                                )
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">
                                                    Aucune
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getRoleBadge(user.role)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                user.is_active
                                                    ? 'default'
                                                    : 'destructive'
                                            }
                                            className={
                                                user.is_active
                                                    ? 'bg-green-500 hover:bg-green-600'
                                                    : ''
                                            }
                                        >
                                            {user.is_active
                                                ? 'Actif'
                                                : 'Inactif'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(user)}
                                                className="h-8 w-8 text-slate-500 hover:text-[#1f61e4]"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleDelete(user.id)
                                                }
                                                className="h-8 w-8 text-slate-500 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingUser
                                ? "Modifier l'utilisateur"
                                : 'Nouvel utilisateur'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom complet</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        email: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        {!editingUser && (
                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    required={!editingUser}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="role">Rôle</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value: any) =>
                                    setFormData({ ...formData, role: value })
                                }
                                disabled={false}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un rôle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isSuperAdmin && (
                                        <SelectItem value="manager">
                                            Manager
                                        </SelectItem>
                                    )}
                                    <SelectItem value="cashier">
                                        Caissier
                                    </SelectItem>
                                    <SelectItem value="client">
                                        Client
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isSuperAdmin && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Assigner aux Boutiques
                                </Label>
                                <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-lg border p-1">
                                    {(allShops as any[])?.map((shop) => (
                                        <div
                                            key={shop.id}
                                            onClick={() => {
                                                const current =
                                                    formData.shop_ids || [];
                                                const next = current.includes(
                                                    shop.id,
                                                )
                                                    ? current.filter(
                                                          (id: number) =>
                                                              id !== shop.id,
                                                      )
                                                    : [...current, shop.id];
                                                setFormData({
                                                    ...formData,
                                                    shop_ids: next,
                                                });
                                            }}
                                            className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${
                                                formData.shop_ids?.includes(
                                                    shop.id,
                                                )
                                                    ? 'border-indigo-200 bg-indigo-50'
                                                    : 'bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <div
                                                className={`h-3 w-3 rounded-sm border ${formData.shop_ids?.includes(shop.id) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}
                                            />
                                            <span className="text-xs font-bold">
                                                {shop.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {editingUser && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            is_active: e.target.checked,
                                        })
                                    }
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="is_active">Compte actif</Label>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#1f61e4] hover:bg-[#1f61e4]/90"
                                disabled={
                                    createMutation.isPending ||
                                    updateMutation.isPending
                                }
                            >
                                {createMutation.isPending ||
                                updateMutation.isPending
                                    ? 'Enregistrement...'
                                    : 'Enregistrer'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
