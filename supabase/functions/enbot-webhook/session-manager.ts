// Session persistence manager
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { PersistedUserSession, UserSession } from './types.ts';

export class SessionManager {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Save a user session to the database
   */
  async saveSession(session: UserSession, commandType: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .upsert({
          user_id: session.userId,
          chat_id: session.chatId,
          command_type: commandType,
          step: session.step,
          transaction_data: {
            ...session.transactionData,
            commandType, // Also store in transaction_data for backwards compatibility
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,command_type',
        });

      if (error) {
        console.error('❌ Error saving session:', error);
        throw error;
      }

      console.log(
        `💾 Session saved for user ${session.userId}, command: ${commandType}, step: ${session.step}`,
      );
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Load a user session from the database for a specific command
   */
  async loadSession(
    userId: number,
    commandType?: string,
  ): Promise<PersistedUserSession | null> {
    try {
      let query = this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      if (commandType) {
        // Load session for specific command
        query = query.eq('command_type', commandType);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No session found
          const commandInfo = commandType ? ` for command ${commandType}` : '';
          console.log(
            `📭 No active session found for user ${userId}${commandInfo}`,
          );
          return null;
        }
        console.error('❌ Error loading session:', error);
        throw error;
      }

      console.log(
        `📂 Session loaded for user ${userId}, command: ${data.command_type}, step: ${data.step}`,
      );
      return data as PersistedUserSession;
    } catch (error) {
      console.error('❌ Failed to load session:', error);
      return null;
    }
  }

  /**
   * Load all active sessions for a user (across all commands)
   */
  async loadAllUserSessions(userId: number): Promise<PersistedUserSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ Error loading all sessions:', error);
        throw error;
      }

      console.log(
        `📂 Loaded ${data?.length || 0} active sessions for user ${userId}`,
      );
      return (data || []) as PersistedUserSession[];
    } catch (error) {
      console.error('❌ Failed to load all sessions:', error);
      return [];
    }
  }

  /**
   * Convert persisted session to in-memory session
   */
  persistedToMemory(persisted: PersistedUserSession): UserSession {
    return {
      chatId: persisted.chat_id,
      userId: persisted.user_id,
      step: persisted.step,
      transactionData: persisted.transaction_data || {},
    };
  }

  /**
   * Delete a user session from the database
   */
  async deleteSession(userId: number, commandType?: string): Promise<void> {
    try {
      let query = this.supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (commandType) {
        // Delete session for specific command only
        query = query.eq('command_type', commandType);
      }

      const { error } = await query;

      if (error) {
        console.error('❌ Error deleting session:', error);
        throw error;
      }

      const commandInfo = commandType
        ? ` for command ${commandType}`
        : ' (all commands)';
      console.log(`🗑️ Session deleted for user ${userId}${commandInfo}`);
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ Error cleaning up expired sessions:', error);
        throw error;
      }

      console.log('🧹 Expired sessions cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Check if user has an active session for a specific command
   */
  async hasActiveSession(
    userId: number,
    commandType?: string,
  ): Promise<boolean> {
    const session = await this.loadSession(userId, commandType);
    return session !== null;
  }

  /**
   * Clean all expired sessions (admin function)
   */
  async cleanAllExpiredSessions(): Promise<{ deleted: number }> {
    try {
      const { count, error } = await this.supabase
        .from('user_sessions')
        .delete({ count: 'exact' })
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ Error cleaning all expired sessions:', error);
        throw error;
      }

      const deletedCount = count || 0;
      console.log(`🧹 Cleaned ${deletedCount} expired sessions`);
      return { deleted: deletedCount };
    } catch (error) {
      console.error('❌ Failed to clean all expired sessions:', error);
      throw error;
    }
  }

  /**
   * Clean all sessions (admin function) - use with caution
   */
  async cleanAllSessions(): Promise<{ deleted: number }> {
    try {
      const { count, error } = await this.supabase
        .from('user_sessions')
        .delete({ count: 'exact' });

      if (error) {
        console.error('❌ Error cleaning all sessions:', error);
        throw error;
      }

      const deletedCount = count || 0;
      console.log(`🧹 Cleaned all ${deletedCount} sessions`);
      return { deleted: deletedCount };
    } catch (error) {
      console.error('❌ Failed to clean all sessions:', error);
      throw error;
    }
  }

  /**
   * Get session statistics (admin function)
   */
  async getSessionStats(): Promise<{
    total: number;
    expired: number;
    active: number;
  }> {
    try {
      // Get total sessions
      const { count: totalCount, error: totalError } = await this.supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get expired sessions
      const { count: expiredCount, error: expiredError } = await this.supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());

      if (expiredError) throw expiredError;

      const total = totalCount || 0;
      const expired = expiredCount || 0;
      const active = total - expired;

      return { total, expired, active };
    } catch (error) {
      console.error('❌ Failed to get session stats:', error);
      throw error;
    }
  }
}
