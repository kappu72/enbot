export interface Transaction {
  id: number;
  family: string;
  category: string;
  amount: number;
  period: string;
  contact: string;
  recordedBy: string;
  recordedAt: string;
  chatId: number;
}

export interface UserSession {
  chatId: number;
  userId: number;
  step: 'idle' | 'family' | 'category' | 'amount' | 'period' | 'contact';
  transactionData: Partial<Transaction>;
}

export const FAMILY_OPTIONS = [
  'Famiglia Rossi',
  'Famiglia Bianchi', 
  'Famiglia Verdi',
  'Famiglia Neri',
  'Famiglia Blu'
];

export const CATEGORY_OPTIONS = [
  'quota mensile',
  'quota iscrizione', 
  'altro'
];
