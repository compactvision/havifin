import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const operations = [
  { id: 'change', name: 'Change', icon: ArrowLeftRight, description: 'Échanger des devises', color: 'text-amber-500' },
  { id: 'depot', name: 'Dépôt', icon: ArrowDownCircle, description: 'Déposer de l\'argent', color: 'text-green-500' },
  { id: 'retrait', name: 'Retrait', icon: ArrowUpCircle, description: 'Retirer de l\'argent', color: 'text-blue-500' },
];

export default function OperationSelector({ selectedOperation, onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {operations.map((op) => {
        const Icon = op.icon;
        return (
          <motion.button
            key={op.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(op.id)}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all duration-200 text-center",
              selectedOperation === op.id
                ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 shadow-xl shadow-amber-100"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg"
            )}
          >
            <Icon className={cn("w-10 h-10 mx-auto mb-3", op.color)} />
            <h3 className="text-lg font-bold text-slate-800">{op.name}</h3>
            <p className="text-sm text-slate-500 mt-1">{op.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
}