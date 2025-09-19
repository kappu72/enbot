// Authorization and access control
import type { BotConfig } from './types.ts';

export class AuthManager {
  private allowedGroupId: number[];
  private adminUserIds: number[];

  constructor(config: BotConfig) {
    this.allowedGroupId = config.allowedGroupId;
    this.adminUserIds = config.adminUserIds;
  }

  isAllowedChat(chatId: number, userId?: number): boolean {
    // Allow admin users from any chat
    if (userId && this.adminUserIds.includes(userId)) {
      return true;
    }
    // Allow anyone from the specified group
    return this.allowedGroupId.includes(chatId);
  }

  isAdmin(userId: number): boolean {
    return this.adminUserIds.includes(userId);
  }

  getAuthInfo(): { allowedGroupId: string; adminCount: number } {
    return {
      allowedGroupId: this.allowedGroupId.join(', '),
      adminCount: this.adminUserIds.length,
    };
  }
}
