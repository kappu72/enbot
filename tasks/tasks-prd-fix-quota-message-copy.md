## Relevant Files

- `supabase/functions/enbot-webhook/commands/monthly-subscription-command.ts` - Contains the main quota command with the escaped character issue in notification message
- `supabase/functions/enbot-webhook/utils/markdown-utils.ts` - Contains MarkdownV2 utility functions that may need enhancement
- `supabase/functions/enbot-webhook/telegram-client.ts` - Telegram client that handles message sending with parse_mode
- `supabase/functions/enbot-webhook/commands/command-interface.ts` - Base command class with sendMessage and editMessage methods
- `supabase/functions/enbot-webhook/commands/help-command.ts` - Help command that uses MarkdownV2 formatting
- `supabase/functions/enbot-webhook/commands/transaction-command.ts` - Transaction command that also uses MarkdownV2 formatting
- `supabase/functions/enbot-webhook/commands/monthly-subscription-command.test.ts` - Unit tests for monthly subscription command (to be created)
- `supabase/functions/enbot-webhook/utils/markdown-utils.test.ts` - Unit tests for markdown utilities (to be created)

### Notes

- Unit tests should be placed alongside the code files they are testing
- The main issue is in line 602 of monthly-subscription-command.ts where `\\nn` should be `\n`
- Need to audit all commands for consistent MarkdownV2 formatting
- Telegram client already supports parse_mode: 'MarkdownV2' in editMessage method

## Tasks

- [x] 1.0 Fix the immediate escaped character issue in quota notification
  - [x] 1.1 Fix the `\\nn` issue in line 602 of monthly-subscription-command.ts
  - [x] 1.2 Test the quota command to verify line breaks render correctly
  - [x] 1.3 Verify the notification message displays properly formatted

- [x] 2.0 Audit and fix MarkdownV2 formatting in /quota command
  - [x] 2.1 Review all sendMessage calls in monthly-subscription-command.ts
  - [x] 2.2 Review all editMessage calls in monthly-subscription-command.ts
  - [x] 2.3 Check all step presentation messages for proper MarkdownV2 formatting
  - [x] 2.4 Check all error messages for proper MarkdownV2 formatting
  - [x] 2.5 Fix any escaped character issues found in /quota command messages

- [ ] 3.0 Enhance markdown utility functions for better consistency
  - [ ] 3.1 Add a function to handle line breaks properly in MarkdownV2
  - [ ] 3.2 Add a function to format multi-line messages with proper escaping
  - [ ] 3.3 Add validation function to check if text is properly escaped
  - [ ] 3.4 Update existing utility functions to handle edge cases
  - [ ] 3.5 Add documentation for all markdown utility functions

- [ ] 4.0 Add comprehensive testing for message formatting
  - [ ] 4.1 Create unit tests for markdown-utils.ts functions
  - [ ] 4.2 Create unit tests for monthly-subscription-command notification message
  - [ ] 4.3 Create integration tests for quota command message formatting
  - [ ] 4.4 Add tests for edge cases with special characters
  - [ ] 4.5 Add tests for multi-line message formatting

- [ ] 5.0 Update Telegram client to ensure consistent MarkdownV2 usage
  - [ ] 5.1 Add parse_mode: 'MarkdownV2' to sendMessage method by default
  - [ ] 5.2 Update editMessage method to ensure consistent MarkdownV2 usage
  - [ ] 5.3 Add validation to prevent sending improperly formatted messages
  - [ ] 5.4 Update error handling for MarkdownV2 parsing errors
  - [ ] 5.5 Add logging for message formatting issues
