import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TicketSuccess({ ticketNumber, onNewTicket }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-200"
      >
        <CheckCircle2 className="w-12 h-12 text-white" />
      </motion.div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">Demande enregistrée!</h2>
      <p className="text-slate-500 mb-8">Veuillez patienter, vous serez appelé bientôt</p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 max-w-sm mx-auto shadow-2xl"
      >
        <div className="flex items-center justify-center gap-2 text-amber-400 mb-4">
          <Ticket className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Votre numéro</span>
        </div>
        <div className="text-6xl font-black text-white mb-4 font-mono tracking-wider">
          {ticketNumber}
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>Surveillez l'écran d'affichage</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8"
      >
        <Button
          onClick={onNewTicket}
          variant="outline"
          className="rounded-full px-8"
        >
          Nouvelle demande
        </Button>
      </motion.div>
    </motion.div>
  );
}