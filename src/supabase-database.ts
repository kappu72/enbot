import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Transaction } from './types';

export class SupabaseDatabase {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  async saveTransaction(transaction: Omit<Transaction, 'id'>): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .insert({
          family: transaction.family,
          category: transaction.category,
          amount: transaction.amount,
          period: transaction.period,
          contact: transaction.contact,
          recorded_by: transaction.recordedBy,
          recorded_at: transaction.recordedAt,
          chat_id: transaction.chatId
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving transaction:', error);
        throw error;
      }

      console.log('✅ Transaction saved with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async getTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      // Transform data to match our Transaction interface
      const transactions: Transaction[] = data.map(row => ({
        id: row.id,
        family: row.family,
        category: row.category,
        amount: parseFloat(row.amount),
        period: row.period,
        contact: row.contact,
        recordedBy: row.recorded_by,
        recordedAt: row.recorded_at,
        chatId: row.chat_id
      }));

      console.log(`✅ Fetched ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async getTransactionById(id: number): Promise<Transaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching transaction by ID:', error);
        throw error;
      }

      const transaction: Transaction = {
        id: data.id,
        family: data.family,
        category: data.category,
        amount: parseFloat(data.amount),
        period: data.period,
        contact: data.contact,
        recordedBy: data.recorded_by,
        recordedAt: data.recorded_at,
        chatId: data.chat_id
      };

      return transaction;
    } catch (error) {
      console.error('Error fetching transaction by ID:', error);
      throw error;
    }
  }

  async getTransactionsByFamily(family: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('family', family)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions by family:', error);
        throw error;
      }

      const transactions: Transaction[] = data.map(row => ({
        id: row.id,
        family: row.family,
        category: row.category,
        amount: parseFloat(row.amount),
        period: row.period,
        contact: row.contact,
        recordedBy: row.recorded_by,
        recordedAt: row.recorded_at,
        chatId: row.chat_id
      }));

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions by family:', error);
      throw error;
    }
  }

  async getTransactionsByCategory(category: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('category', category)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions by category:', error);
        throw error;
      }

      const transactions: Transaction[] = data.map(row => ({
        id: row.id,
        family: row.family,
        category: row.category,
        amount: parseFloat(row.amount),
        period: row.period,
        contact: row.contact,
        recordedBy: row.recorded_by,
        recordedAt: row.recorded_at,
        chatId: row.chat_id
      }));

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions by category:', error);
      throw error;
    }
  }

  async getTotalAmountByFamily(family: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('family', family);

      if (error) {
        console.error('Error calculating total by family:', error);
        throw error;
      }

      const total = data.reduce((sum, row) => sum + parseFloat(row.amount), 0);
      return total;
    } catch (error) {
      console.error('Error calculating total by family:', error);
      throw error;
    }
  }

  async getTotalAmountByCategory(category: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('category', category);

      if (error) {
        console.error('Error calculating total by category:', error);
        throw error;
      }

      const total = data.reduce((sum, row) => sum + parseFloat(row.amount), 0);
      return total;
    } catch (error) {
      console.error('Error calculating total by category:', error);
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Health check failed:', error);
        return false;
      }

      console.log('✅ Supabase health check passed');
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
