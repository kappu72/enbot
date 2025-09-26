// Session persistence manager
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { PersistedUserSession, UserSession } from './types.ts';

export interface SessionMessage {
  id: number;
  session_id: number;
  message_id: number;
  message_type: 'incoming' | 'outgoing';
  created_at: string;
  is_last_message: boolean;
}

export class SessionManager {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async saveMessageId(
    userId: number,
    chatId: number,
    commandType: string,
    messageId: number,
  ): Promise<void> {
    await this.supabase
      .from('user_sessions')
      .update({ message_id: messageId })
      .eq('user_id', userId)
      .eq('chat_id', chatId)
      .eq('command_type', commandType);
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
          onConflict: 'user_id,chat_id',
        }).eq('user_id', session.userId).eq('chat_id', session.chatId);

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
    chatId: number,
    commandType?: string,
  ): Promise<PersistedUserSession | null> {
    try {
      let query = this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('chat_id', chatId)
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
            `📭 No active session found for user ${userId} in chat ${chatId}${commandInfo}`,
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
   * Load all active sessions for a user by chatId
   */
  async loadUserSession(
    userId: number,
    chatId: number,
  ): Promise<PersistedUserSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('chat_id', chatId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        console.error('❌ Error loading all sessions:', error);
        throw error;
      }

      console.log(
        `📂 Loaded ${data?.length || 0} active sessions for user ${userId}`,
      );
      return data as PersistedUserSession;
    } catch (error) {
      console.error('❌ Failed to load all sessions:', error);
      return null;
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
      messageId: persisted.message_id || null,
    };
  }

  /**
   * Delete a user session from the database
   */
  async deleteSession(
    userId: number,
    chatId: number,
    commandType?: string,
  ): Promise<void> {
    try {
      let query = this.supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('chat_id', chatId);

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
   * Check if user has an active session for a specific command
   */
  async hasActiveSession(
    userId: number,
    chatId: number,
    commandType?: string,
  ): Promise<boolean> {
    const session = await this.loadSession(userId, chatId, commandType);
    return session !== null;
  }

  /**
   * Clean all expired sessions (admin function)
   * Note: Messages are automatically cleaned up due to CASCADE DELETE
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
      console.log(
        `🧹 Cleaned ${deletedCount} expired sessions (messages automatically cleaned up via CASCADE DELETE)`,
      );
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
        .delete({ count: 'exact' })
        .not('id', 'is', 'null');
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

  // ===== MESSAGE TRACKING METHODS =====

  /**
   * Track a message for a session
   * @param sessionId - The session ID to track the message for
   * @param messageId - The Telegram message ID
   * @param messageType - Whether the message is incoming (from user) or outgoing (from bot)
   * @param isLastMessage - Whether this is the final message to preserve during cleanup
   */
  async trackMessage(
    sessionId: number,
    messageId: number,
    messageType: 'incoming' | 'outgoing',
    isLastMessage: boolean = false,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          message_id: messageId,
          message_type: messageType,
          is_last_message: isLastMessage,
        });

      if (error) {
        console.error('❌ Error tracking message:', error);
        throw error;
      }

      console.log(
        `📝 Message tracked: session ${sessionId}, message ${messageId}, type: ${messageType}, last: ${isLastMessage}`,
      );
    } catch (error) {
      console.error('❌ Failed to track message:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a session
   * @param sessionId - The session ID to get messages for
   * @returns Array of tracked messages
   */
  async getSessionMessages(sessionId: number): Promise<SessionMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error getting session messages:', error);
        throw error;
      }

      return (data as SessionMessage[]) || [];
    } catch (error) {
      console.error('❌ Failed to get session messages:', error);
      return [];
    }
  }

  /**
   * Mark a message as the last message to preserve during cleanup
   * @param sessionId - The session ID
   * @param messageId - The message ID to mark as last
   */
  async markLastMessage(sessionId: number, messageId: number): Promise<void> {
    try {
      // First, unmark any existing last messages for this session
      await this.supabase
        .from('session_messages')
        .update({ is_last_message: false })
        .eq('session_id', sessionId);

      // Then mark the specified message as last
      const { error } = await this.supabase
        .from('session_messages')
        .update({ is_last_message: true })
        .eq('session_id', sessionId)
        .eq('message_id', messageId);

      if (error) {
        console.error('❌ Error marking last message:', error);
        throw error;
      }

      console.log(
        `🏷️ Message ${messageId} marked as last for session ${sessionId}`,
      );
    } catch (error) {
      console.error('❌ Failed to mark last message:', error);
      throw error;
    }
  }

  /**
   * Clean up session messages (delete all except the last one)
   * @param sessionId - The session ID to clean up messages for
   * @param preserveLast - Whether to preserve the last message (default: true)
   * @returns Number of messages deleted
   */
  async cleanupSessionMessages(
    sessionId: number,
    preserveLast: boolean = true,
  ): Promise<{ deleted: number; preserved: number }> {
    try {
      let deletedCount = 0;
      let preservedCount = 0;

      if (preserveLast) {
        // Get messages to delete (all except the last one)
        const { data: messagesToDelete, error: selectError } = await this
          .supabase
          .from('session_messages')
          .select('id, message_id, is_last_message')
          .eq('session_id', sessionId)
          .eq('is_last_message', false);

        if (selectError) {
          console.error('❌ Error selecting messages to delete:', selectError);
          throw selectError;
        }

        // Delete messages that are not marked as last
        if (messagesToDelete && messagesToDelete.length > 0) {
          const { count, error: deleteError } = await this.supabase
            .from('session_messages')
            .delete({ count: 'exact' })
            .eq('session_id', sessionId)
            .eq('is_last_message', false);

          if (deleteError) {
            console.error('❌ Error deleting session messages:', deleteError);
            throw deleteError;
          }

          deletedCount = count || 0;
        }

        // Count preserved messages
        const { count: preservedCountResult, error: preservedError } =
          await this.supabase
            .from('session_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('is_last_message', true);

        if (preservedError) {
          console.error(
            '❌ Error counting preserved messages:',
            preservedError,
          );
          throw preservedError;
        }

        preservedCount = preservedCountResult || 0;
      } else {
        // Delete all messages for the session
        const { count, error } = await this.supabase
          .from('session_messages')
          .delete({ count: 'exact' })
          .eq('session_id', sessionId);

        if (error) {
          console.error('❌ Error deleting all session messages:', error);
          throw error;
        }

        deletedCount = count || 0;
        preservedCount = 0;
      }

      console.log(
        `🧹 Session ${sessionId} cleanup: ${deletedCount} deleted, ${preservedCount} preserved`,
      );

      return { deleted: deletedCount, preserved: preservedCount };
    } catch (error) {
      console.error('❌ Failed to cleanup session messages:', error);
      throw error;
    }
  }

  /**
   * Get session ID from user_id, chat_id, and command_type
   * This is needed because we need the session ID to track messages
   */
  async getSessionId(
    userId: number,
    chatId: number,
    commandType: string,
  ): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('chat_id', chatId)
        .eq('command_type', commandType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No session found
          return null;
        }
        console.error('❌ Error getting session ID:', error);
        throw error;
      }

      return data?.id || null;
    } catch (error) {
      console.error('❌ Failed to get session ID:', error);
      return null;
    }
  }
}
