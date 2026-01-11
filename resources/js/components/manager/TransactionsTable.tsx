import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import moment from 'moment';

const serviceNames = {
  mpesa: 'M-Pesa',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  afrimoney: 'Afrimoney',
  rawbank: 'Rawbank',
  equity_bcdc: 'Equity BCDC',
  tmb: 'TMB',
  fbn_bank: 'FBN Bank',
};

const operationColors = {
  change: 'bg-amber-100 text-amber-700',
  depot: 'bg-green-100 text-green-700',
  retrait: 'bg-blue-100 text-blue-700',
};

export default function TransactionsTable({ transactions }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions récentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jeton</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Opération</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-bold text-amber-500">{tx.ticket_number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{tx.client_phone}</div>
                  </TableCell>
                  <TableCell>{serviceNames[tx.service] || tx.service}</TableCell>
                  <TableCell>
                    <Badge className={operationColors[tx.operation_type]}>
                      {tx.operation_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tx.amount_from?.toLocaleString()} {tx.currency_from}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-green-600">{tx.amount_to?.toLocaleString()} {tx.currency_to}</span>
                    </div>
                  </TableCell>
                  <TableCell>{tx.exchange_rate}</TableCell>
                  <TableCell className="text-slate-500">
                    {moment(tx.created_date).format('DD/MM HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Aucune transaction
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}