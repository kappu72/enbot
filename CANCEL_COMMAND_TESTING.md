# Cancel Command Testing Guide

This document outlines the testing procedures for the Cancel Command feature. Since you requested real bot testing instead of mock tests, these tests should be performed manually with the actual Telegram bot in a test environment.

## Pre-deployment Testing Checklist

- [ ] Code review completed
- [ ] Linting passes (`npx ultracite check`)
- [ ] TypeScript compilation succeeds
- [ ] Command registered in bot.ts
- [ ] Help text updated

## Real Bot Testing Scenarios

### Test Environment Setup

1. **Deploy to Development Environment**:
   - Deploy the bot to a development Supabase project
   - Use a test Telegram bot token
   - Set up in a test chat/group

2. **Test Chat Setup**:
   - Create a test Telegram group or use a private chat
   - Add the test bot to the chat
   - Ensure only test users have access

### Test Scenario 1: No Active Session

**Steps**:
1. Send `/cancel` command to the bot
2. Verify the bot responds with: "❌ Nessuna sessione attiva da cancellare"

**Expected Result**:
- Bot sends appropriate message when no session exists
- No errors in console logs

**Verification**:
- Check Supabase logs for any errors
- Confirm no database operations occurred

### Test Scenario 2: Active Session - Confirmation Flow

**Steps**:
1. Start a command (e.g., `/entrata`)
2. Send `/cancel` command
3. Verify confirmation prompt appears with:
   - Warning message about data loss
   - Current command info (e.g., "Comando in corso: entrata")
   - Two buttons: "✅ Conferma" and "❌ Annulla"

**Expected Result**:
- Confirmation prompt displays correctly
- Inline keyboard buttons are functional
- Current session info is displayed

**Verification**:
- Check that buttons appear and are clickable
- Verify session information is accurate

### Test Scenario 3: Cancel Confirmation - Session Deletion

**Steps**:
1. Start a command (e.g., `/entrata`)
2. Go through a few steps (select category, enter amount)
3. Send `/cancel` and click "✅ Conferma"
4. Verify:
   - Success message: "✅ Sessione cancellata con successo!"
   - All previous messages are deleted (except the cancel confirmation)
   - Session is completely removed from database

**Expected Result**:
- Session data is deleted from database
- Associated messages are cleaned up in Telegram
- Bot returns to clean state

**Verification**:
- Check Supabase logs for session deletion
- Verify no session exists in database after cancellation
- Confirm Telegram messages are cleaned up

### Test Scenario 4: Cancel Confirmation - User Cancels

**Steps**:
1. Start a command (e.g., `/uscita`)
2. Send `/cancel` command
3. Click "❌ Annulla" button
4. Verify:
   - Message: "❌ Operazione annullata"
   - Session remains active
   - Can continue with the original command

**Expected Result**:
- Cancellation is cancelled
- Original session remains intact
- User can continue their workflow

**Verification**:
- Check that session still exists in database
- Verify user can continue the original command flow

### Test Scenario 5: Message Cleanup Verification

**Steps**:
1. Start a long command flow (e.g., `/entrata` with multiple steps)
2. Send `/cancel` and confirm
3. Check Telegram chat:
   - All previous command messages should be deleted
   - Only the cancel confirmation message should remain

**Expected Result**:
- Comprehensive message cleanup
- No orphaned messages left in chat

**Verification**:
- Manually inspect Telegram chat history
- Confirm only cancel confirmation message remains

### Test Scenario 6: Error Handling

**Steps**:
1. Start a command
2. Send `/cancel` (simulate network issues if possible)
3. Verify error handling:
   - If session deletion fails, appropriate error message is shown
   - If message cleanup fails, graceful degradation

**Expected Result**:
- Proper error messages for users
- No crashes or unhandled exceptions
- Graceful fallback behavior

**Verification**:
- Check console logs for error handling
- Verify user receives meaningful error messages

### Test Scenario 7: Edge Cases

**Multiple Active Commands**:
1. Start one command (e.g., `/entrata`)
2. Start another command in same chat (if possible)
3. Send `/cancel` - should cancel the current active session

**Command During Different Steps**:
1. Test `/cancel` during various steps of command flows
2. Verify cleanup works consistently

**Concurrent Users**:
1. Have multiple users testing simultaneously
2. Verify no cross-contamination of sessions

## Post-Testing Checklist

- [ ] All test scenarios completed successfully
- [ ] No regressions in existing functionality
- [ ] Help command includes `/cancel` command
- [ ] Bot commands menu updated (if applicable)
- [ ] Database integrity verified
- [ ] Logs reviewed for any issues

## Troubleshooting

**Common Issues**:

1. **Session not found**: Ensure session exists before testing
2. **Messages not deleting**: Check Telegram API permissions
3. **Database errors**: Verify Supabase connection and permissions
4. **Button not appearing**: Check inline keyboard implementation

**Debug Commands**:
- Check Supabase logs for session operations
- Monitor bot console output for errors
- Use Telegram's message inspection tools

## Production Deployment

After successful testing:

1. Deploy to production environment
2. Test critical scenarios in production (no active session, active session)
3. Monitor for any issues in production logs
4. Update user documentation if needed

## Success Criteria

✅ All test scenarios pass
✅ No critical bugs found
✅ Message cleanup works correctly
✅ Session deletion is reliable
✅ Error handling is robust
✅ User experience is smooth
✅ No performance issues
✅ Help system updated correctly


