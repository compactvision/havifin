import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface KanbanColumnProps {
    title: string;
    icon: LucideIcon;
    count: number;
    color: string;
    children: React.ReactNode;
}

export default function KanbanColumn({
    title,
    icon: Icon,
    count,
    color,
    children,
}: KanbanColumnProps) {
    return (
        <div className="flex h-full max-w-[450px] min-w-[320px] flex-1 flex-col">
            {/* Column Header */}
            <div className="mb-6 flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'rounded-2xl border p-2.5 shadow-sm',
                            color,
                        )}
                    >
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl leading-none font-black tracking-tight text-slate-800">
                            {title}
                        </h3>
                        <p className="mt-1.5 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                            {count} {count > 1 ? 'Clients' : 'Client'}
                        </p>
                    </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-black text-slate-400 shadow-inner">
                    {count}
                </div>
            </div>

            {/* Scrollable Area */}
            <div className="scrollbar-none custom-kanban-scroll flex-1 overflow-y-auto pr-2">
                <div className="space-y-4 pb-12">{children}</div>
            </div>
        </div>
    );
}
