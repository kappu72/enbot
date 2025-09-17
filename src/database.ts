import sqlite3 from 'sqlite3';
import { Transaction } from './types';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/transactions.db';

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT NOT NULL,
        contact TEXT NOT NULL,
        recordedBy TEXT NOT NULL,
        recordedAt TEXT NOT NULL,
        chatId INTEGER NOT NULL
      )
    `;

    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Database initialized successfully');
      }
    });
  }

  async saveTransaction(transaction: Omit<Transaction, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO transactions (family, category, amount, period, contact, recordedBy, recordedAt, chatId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        transaction.family,
        transaction.category,
        transaction.amount,
        transaction.period,
        transaction.contact,
        transaction.recordedBy,
        transaction.recordedAt,
        transaction.chatId
      ];

      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getTransactions(limit: number = 10): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM transactions 
        ORDER BY recordedAt DESC 
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as Transaction[]);
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
