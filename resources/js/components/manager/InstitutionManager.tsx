import { base44, Institution } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import axios from '@/lib/axios';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Building2,
    Landmark,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    ShieldCheck,
    Smartphone,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function InstitutionManager() {
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newInstitution, setNewInstitution] = useState<{
        name: string;
        type: 'bank' | 'mobile_money';
        code: string;
        logo: File | null;
    }>({
        name: '',
        type: 'bank',
        code: '',
        logo: null,
    });

    const { data: institutions = [], isLoading } = useQuery({
        queryKey: ['institutions'],
        queryFn: () => base44.entities.Institution.list(),
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof newInstitution) => {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('type', data.type);
            formData.append('code', data.code);
            if (data.logo) {
                formData.append('logo', data.logo);
            }
            // Need to pass FormData, modifying base44 client might be needed or using fetch directly here for custom FormData
            // Given base44 client likely expects JSON, we might need a custom request here or check if base44 supports FormData.
            // Assuming base44 client can handle it or we use raw fetch for this specific case to be safe.
            // But to keep consistency, let's assume we need to use a custom axios/fetch call or if base44 has a method.
            // Since I cannot see base44 implementation fully for 'create', I will trust standard axios behavior if used,
            // but for safety with file uploads, explicit implementation is better.
            // However, to stick to the pattern, let's see if we can just pass FormData to the underlying call.
            // If base44.entities.Institution.create expects an object, we might need to cast or ensure it handles FormData.
            // Let's assume for now we can pass it, if not I'll fix.
            // BUT: base44Client likely sends JSON.
            // Plan B: Use a direct fetch/axios call here for the upload to ensure multipart/form-data.

            return axios.post('/api/institutions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['institutions'] });
            resetForm();
            toast.success('Institution ajoutée avec succès');
        },
        onError: () => toast.error("Erreur lors de l'ajout de l'institution"),
    });

    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: typeof newInstitution;
        }) => {
            const formData = new FormData();
            formData.append('_method', 'PUT'); // Spoof PUT for Laravel multipart
            formData.append('name', data.name);
            formData.append('type', data.type);
            formData.append('code', data.code);
            if (data.logo) {
                formData.append('logo', data.logo);
            }

            return axios.post(`/api/institutions/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['institutions'] });
            resetForm();
            toast.success('Institution mise à jour avec succès');
        },
        onError: () => toast.error('Erreur lors de la mise à jour'),
    });

    const resetForm = () => {
        setNewInstitution({ name: '', type: 'bank', code: '', logo: null });
        setEditingId(null);
        setShowAddForm(false);
    };

    const handleEdit = (inst: Institution) => {
        setNewInstitution({
            name: inst.name,
            type: inst.type as 'bank' | 'mobile_money',
            code: inst.code,
            logo: null,
        });
        setEditingId(inst.id);
        setShowAddForm(true);
    };

    const deleteMutation = useMutation({
        mutationFn: (id: number) => base44.entities.Institution.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['institutions'] });
            toast.success('Institution supprimée');
        },
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
            base44.entities.Institution.update(id, { is_active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['institutions'] });
            toast.success('Statut mis à jour');
        },
    });

    return (
        <div className="space-y-8">
            {/* Header Control */}
            <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-100 bg-slate-100/50 p-4">
                <div className="ml-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black tracking-tight text-slate-800 uppercase">
                            Partenaires & Institutions
                        </h4>
                        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                            {institutions.length} Entités Enregistrées
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={cn(
                        'h-11 rounded-xl px-6 text-xs font-black tracking-widest uppercase transition-all',
                        showAddForm
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700',
                    )}
                >
                    {showAddForm ? (
                        <X className="mr-2 h-4 w-4" />
                    ) : (
                        <Plus className="mr-2 h-4 w-4" />
                    )}
                    {showAddForm ? 'Fermer' : 'Nouvelle Institution'}
                </Button>
            </div>

            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="relative rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
                            <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 bg-indigo-500/10 blur-[100px]" />

                            <h5 className="mb-8 flex items-center gap-3 text-xl font-black tracking-tight">
                                <Landmark className="h-6 w-6 text-indigo-400" />
                                {editingId
                                    ? "Modifier l'institution"
                                    : 'Configurer un nouveau partenaire'}
                            </h5>

                            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Nom de l'institution
                                    </Label>
                                    <Input
                                        placeholder="ex: Bank of Africa"
                                        value={newInstitution.name}
                                        onChange={(e) =>
                                            setNewInstitution({
                                                ...newInstitution,
                                                name: e.target.value,
                                            })
                                        }
                                        className="h-12 rounded-xl border-white/10 bg-white/5 font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Type de service
                                    </Label>
                                    <Select
                                        value={newInstitution.type}
                                        onValueChange={(v: any) =>
                                            setNewInstitution({
                                                ...newInstitution,
                                                type: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-slate-800 bg-slate-900 text-white">
                                            <SelectItem
                                                value="bank"
                                                className="focus:bg-slate-800"
                                            >
                                                Banque Classique
                                            </SelectItem>
                                            <SelectItem
                                                value="mobile_money"
                                                className="focus:bg-slate-800"
                                            >
                                                Mobile Money
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Code Identifiant
                                    </Label>
                                    <Input
                                        placeholder="ex: BOA-CD"
                                        value={newInstitution.code}
                                        onChange={(e) =>
                                            setNewInstitution({
                                                ...newInstitution,
                                                code: e.target.value,
                                            })
                                        }
                                        className="h-12 rounded-xl border-white/10 bg-white/5 font-mono font-black text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 space-y-2">
                                <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Logo de l'institution (Optionnel)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                        {newInstitution.logo ? (
                                            <img
                                                src={URL.createObjectURL(
                                                    newInstitution.logo,
                                                )}
                                                alt="Preview"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Building2 className="h-6 w-6 text-white/20" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (
                                                    e.target.files &&
                                                    e.target.files[0]
                                                ) {
                                                    setNewInstitution({
                                                        ...newInstitution,
                                                        logo: e.target.files[0],
                                                    });
                                                }
                                            }}
                                            className="h-12 w-full cursor-pointer rounded-xl border-white/10 bg-white/5 pt-2 text-sm font-bold text-white file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-indigo-700"
                                        />
                                        <p className="mt-2 text-xs text-slate-400">
                                            Format recommandé: PNG ou JPG, fond
                                            transparent. Max 2MB.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex justify-end gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={resetForm}
                                    className="h-12 rounded-xl px-8 text-xs font-black tracking-widest text-slate-400 uppercase hover:bg-white/5 hover:text-white"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (editingId) {
                                            updateMutation.mutate({
                                                id: editingId,
                                                data: newInstitution,
                                            });
                                        } else {
                                            createMutation.mutate(
                                                newInstitution,
                                            );
                                        }
                                    }}
                                    disabled={
                                        createMutation.isPending ||
                                        updateMutation.isPending ||
                                        !newInstitution.name ||
                                        !newInstitution.code
                                    }
                                    className="h-12 rounded-xl bg-white px-10 text-xs font-black tracking-widest text-slate-900 uppercase transition-all hover:bg-slate-100"
                                >
                                    {createMutation.isPending ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            {editingId
                                                ? 'Mettre à jour'
                                                : 'Enregistrer Partenaire'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {institutions.map((inst: Institution) => (
                    <motion.div
                        key={inst.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group relative overflow-hidden rounded-[2rem] border-2 border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:border-indigo-100"
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <div
                                className={cn(
                                    'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:rotate-6',
                                    inst.type === 'bank'
                                        ? 'bg-slate-900 text-white shadow-slate-900/10'
                                        : 'bg-emerald-500 text-white shadow-emerald-500/10',
                                )}
                            >
                                {inst.logo_url ? (
                                    <img
                                        src={inst.logo_url}
                                        alt={inst.name}
                                        className="h-9 w-9 object-contain"
                                    />
                                ) : inst.type === 'bank' ? (
                                    <Building2 className="h-7 w-7" />
                                ) : (
                                    <Smartphone className="h-7 w-7" />
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        toggleStatusMutation.mutate({
                                            id: inst.id,
                                            is_active: !inst.is_active,
                                        })
                                    }
                                    className={cn(
                                        'h-10 w-10 rounded-xl transition-all',
                                        inst.is_active
                                            ? 'bg-emerald-50 text-emerald-500'
                                            : 'bg-slate-50 text-slate-300',
                                    )}
                                >
                                    <ShieldCheck className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        deleteMutation.mutate(inst.id)
                                    }
                                    className="h-10 w-10 rounded-xl text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(inst)}
                                    className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    <Pencil className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black tracking-tight text-slate-900">
                                    {inst.name}
                                </h3>
                                {!inst.is_active && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black tracking-widest text-slate-400 uppercase">
                                        Inactif
                                    </span>
                                )}
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                                <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                    {inst.code}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-bold text-indigo-500 uppercase">
                                    {inst.type === 'bank'
                                        ? 'Banque'
                                        : 'Mobile Money'}
                                </span>
                            </div>
                        </div>

                        {/* Background Decor */}
                        <div
                            className={cn(
                                'absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-[0.03] transition-transform group-hover:scale-150',
                                inst.type === 'bank'
                                    ? 'bg-slate-900'
                                    : 'bg-emerald-500',
                            )}
                        />
                    </motion.div>
                ))}

                {institutions.length === 0 && !isLoading && (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 py-20">
                        <Landmark className="mb-4 h-16 w-16 text-slate-200" />
                        <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                            Aucune institution configurée
                        </p>
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="flex justify-center p-20">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                </div>
            )}
        </div>
    );
}
