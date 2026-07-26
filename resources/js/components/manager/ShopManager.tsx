import { base44, type Shop } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Edit, Plus, Store, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ShopManager() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        counter_count: 1,
        is_active: true,
        user_ids: [] as number[],
    });

    // Fetch shops
    const { data: shops, isLoading: isLoadingShops } = useQuery({
        queryKey: ['shops'],
        queryFn: base44.entities.Shop.list,
    });

    // Fetch users (for assignment)
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: base44.entities.User.list,
    });

    // Create shop mutation
    const createMutation = useMutation({
        mutationFn: base44.entities.Shop.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            setIsModalOpen(false);
            resetForm();
            toast.success('Boutique créée avec succès');
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message || 'Erreur lors de la création',
            );
        },
    });

    // Update shop mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            base44.entities.Shop.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            setEditingShop(null);
            setIsModalOpen(false);
            resetForm();
            toast.success('Boutique mise à jour avec succès');
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message ||
                    'Erreur lors de la mise à jour',
            );
        },
    });

    // Delete shop mutation
    const deleteMutation = useMutation({
        mutationFn: base44.entities.Shop.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            toast.success('Boutique supprimée avec succès');
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            counter_count: 1,
            is_active: true,
            user_ids: [],
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingShop) {
            updateMutation.mutate({ id: editingShop.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (shop: Shop) => {
        setEditingShop(shop);
        setFormData({
            name: shop.name,
            address: shop.address || '',
            counter_count: shop.counter_count,
            is_active: shop.is_active,
            user_ids:
                shop.users
                    ?.filter((user) => user.role === 'manager')
                    .map((user) => user.id) || [],
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('Supprimer cette boutique ?')) {
            deleteMutation.mutate(id);
        }
    };

    const toggleUser = (userId: number) => {
        setFormData((prev) => {
            const userIds = [...prev.user_ids];
            const index = userIds.indexOf(userId);
            if (index > -1) {
                userIds.splice(index, 1);
            } else {
                userIds.push(userId);
            }
            return { ...prev, user_ids: userIds };
        });
    };

    return (
        <div className="space-y-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="brand-kicker">Portefeuille Havifin</p>
                    <h2 className="brand-title mt-2 text-3xl text-slate-950">
                        Gestion des boutiques
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                        Ajoutez vos points de vente, nommez leurs managers et
                        consultez leurs statistiques
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            setEditingShop(null);
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="h-12 rounded-xl px-6 text-xs tracking-widest uppercase"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvelle Boutique
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-brand-blue/10 bg-white shadow-[0_16px_45px_rgba(32,0,255,0.06)]">
                <Table>
                    <TableHeader className="bg-brand-blue/[0.035]">
                        <TableRow className="border-brand-blue/10 hover:bg-transparent">
                            <TableHead className="py-5 pl-8 text-[11px] font-black tracking-widest text-slate-400 uppercase">
                                Boutique
                            </TableHead>
                            <TableHead className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                                Guichets
                            </TableHead>
                            <TableHead className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                                Managers
                            </TableHead>
                            <TableHead className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                                Statut
                            </TableHead>
                            <TableHead className="pr-8 text-right text-[11px] font-black tracking-widest text-slate-400 uppercase">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingShops ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-40 text-center font-medium text-slate-400"
                                >
                                    Chargement des boutiques...
                                </TableCell>
                            </TableRow>
                        ) : shops?.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-40 text-center text-slate-400"
                                >
                                    <Store className="mx-auto mb-4 h-12 w-12 opacity-10" />
                                    Aucune boutique configurée
                                </TableCell>
                            </TableRow>
                        ) : (
                            shops?.map((shop) => (
                                <TableRow
                                    key={shop.id}
                                    className="group border-brand-blue/[0.07] transition-colors hover:bg-brand-blue/[0.025]"
                                >
                                    <TableCell className="py-6 pl-8">
                                        <div>
                                            <div className="text-sm font-black text-slate-950">
                                                {shop.name}
                                            </div>
                                            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                {shop.address || 'Sans adresse'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className="rounded-lg border-slate-200 bg-white px-2 py-1 text-[10px] font-black tracking-widest text-slate-600 uppercase"
                                        >
                                            {shop.counter_count} Guichet(s)
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                {shop.users?.some(
                                                    (user) =>
                                                        user.role === 'manager',
                                                ) ? (
                                                    shop.users
                                                        .filter(
                                                            (user) =>
                                                                user.role ===
                                                                'manager',
                                                        )
                                                        .slice(0, 3)
                                                        .map((user) => (
                                                            <div
                                                                key={user.id}
                                                                title={
                                                                    user.name
                                                                }
                                                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-brand-blue/10 to-brand-cyan/20 text-[10px] font-black text-brand-blue shadow-sm"
                                                            >
                                                                {user.name
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                        ))
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase italic">
                                                        Vide
                                                    </span>
                                                )}
                                            </div>
                                            {(shop.users?.filter(
                                                (user) =>
                                                    user.role === 'manager',
                                            ).length ?? 0) > 3 && (
                                                <span className="text-[10px] font-black text-slate-400">
                                                    +
                                                    {(shop.users?.filter(
                                                        (user) =>
                                                            user.role ===
                                                            'manager',
                                                    ).length ?? 0) - 3}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase ${
                                                shop.is_active
                                                    ? 'border-none bg-emerald-100 text-emerald-600'
                                                    : 'border-none bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {shop.is_active
                                                ? 'Ouvert'
                                                : 'Fermé'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pr-8 text-right">
                                        <div className="flex justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                            <Link
                                                href={`/admin/shops/${shop.id}`}
                                                aria-label={`Ouvrir le dashboard de ${shop.name}`}
                                                title="Dashboard de la boutique"
                                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-blue/10 bg-white text-brand-blue transition-all hover:-translate-y-0.5 hover:border-brand-cyan hover:shadow-lg"
                                            >
                                                <BarChart3 className="h-4 w-4" />
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(shop)}
                                                className="h-9 w-9 rounded-xl border border-brand-blue/10 bg-white text-slate-400 transition-all hover:border-brand-blue hover:text-brand-blue hover:shadow-lg"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleDelete(shop.id)
                                                }
                                                className="sm-red-500/10 h-9 w-9 rounded-xl border border-slate-100 bg-white text-slate-400 transition-all hover:border-red-500 hover:text-red-600 hover:shadow-lg"
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl overflow-hidden rounded-[2.5rem] border-slate-100 p-0">
                    <div className="border-b border-brand-blue/10 bg-gradient-to-r from-brand-blue/[0.06] to-brand-pink/[0.05] p-8">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                                {editingShop
                                    ? 'Modifier Boutique'
                                    : 'Nouvelle Boutique'}
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 p-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label
                                    htmlFor="name"
                                    className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase"
                                >
                                    Nom de la Boutique
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="ex: Shop Central"
                                    className="h-12 font-bold"
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
                            <div className="space-y-3">
                                <Label
                                    htmlFor="counter_count"
                                    className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase"
                                >
                                    Nombre de Guichets
                                </Label>
                                <Input
                                    id="counter_count"
                                    type="number"
                                    min="1"
                                    className="h-12 font-bold"
                                    value={formData.counter_count}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            counter_count: parseInt(
                                                e.target.value,
                                            ),
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label
                                htmlFor="address"
                                className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase"
                            >
                                Adresse / Localisation
                            </Label>
                            <Input
                                id="address"
                                placeholder="ex: Av. du Commerce, Kinshasa"
                                className="h-12 font-bold"
                                value={formData.address}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        address: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                <Users className="h-3 w-3" /> Managers Assignés
                            </Label>
                            <div className="custom-scrollbar grid max-h-40 grid-cols-2 gap-3 overflow-y-auto pr-2">
                                {users
                                    ?.filter((u) => u.role === 'manager')
                                    .map((user) => (
                                        <div
                                            key={user.id}
                                            className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                                                formData.user_ids.includes(
                                                    user.id,
                                                )
                                                    ? 'border-brand-blue/20 bg-brand-blue/[0.05]'
                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                            }`}
                                        >
                                            <Checkbox
                                                id={`user-${user.id}`}
                                                checked={formData.user_ids.includes(
                                                    user.id,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleUser(user.id)
                                                }
                                            />
                                            <Label
                                                htmlFor={`user-${user.id}`}
                                                className="flex flex-1 cursor-pointer flex-col"
                                            >
                                                <span className="text-xs font-bold text-slate-700">
                                                    {user.name}
                                                </span>
                                                <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">
                                                    {user.role}
                                                </span>
                                            </Label>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        is_active: checked as boolean,
                                    })
                                }
                            />
                            <Label
                                htmlFor="is_active"
                                className="cursor-pointer text-xs font-bold text-slate-600"
                            >
                                Boutique Active / Ouverte
                            </Label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="h-12 rounded-xl border-slate-200 px-8 text-xs font-black tracking-widest uppercase hover:bg-slate-50"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="h-12 rounded-xl bg-slate-900 px-8 text-xs font-black tracking-widest text-white uppercase shadow-xl transition-all hover:bg-black"
                                disabled={
                                    createMutation.isPending ||
                                    updateMutation.isPending
                                }
                            >
                                {createMutation.isPending ||
                                updateMutation.isPending
                                    ? 'Chargement...'
                                    : 'Enregistrer'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
