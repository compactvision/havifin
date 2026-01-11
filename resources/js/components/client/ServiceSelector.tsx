import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const services = {
  mobile: [
    { id: 'mpesa', name: 'M-Pesa', color: 'bg-green-500' },
    { id: 'orange_money', name: 'Orange Money', color: 'bg-orange-500' },
    { id: 'airtel_money', name: 'Airtel Money', color: 'bg-red-500' },
    { id: 'afrimoney', name: 'Afrimoney', color: 'bg-blue-500' },
  ],
  banks: [
    { id: 'rawbank', name: 'Rawbank', color: 'bg-blue-700' },
    { id: 'equity_bcdc', name: 'Equity BCDC', color: 'bg-purple-600' },
    { id: 'tmb', name: 'TMB', color: 'bg-teal-600' },
    { id: 'fbn_bank', name: 'FBN Bank', color: 'bg-indigo-600' },
  ]
};

export default function ServiceSelector({ selectedService, onSelect }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-800">Mobile Money</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {services.mobile.map((service) => (
            <motion.button
              key={service.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(service.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                selectedService === service.id
                  ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", service.color)} />
                <span className="font-medium text-slate-700">{service.name}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-800">Banques</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {services.banks.map((service) => (
            <motion.button
              key={service.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(service.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                selectedService === service.id
                  ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", service.color)} />
                <span className="font-medium text-slate-700">{service.name}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}