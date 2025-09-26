# Product Requirements Document: Fix /quota Message Copy with Escaped Characters

## 1. Introduction/Overview

The `/quota` command currently displays messages with incorrectly escaped characters, making the output difficult to read and unprofessional. The bot is using MarkdownV2 formatting but the special characters are not being properly rendered, causing users to see literal escape sequences instead of formatted text.

**Problem**: Users see literal characters like `\n` instead of actual line breaks, and other MarkdownV2 special characters are not being properly escaped/rendered.

**Goal**: Implement proper MarkdownV2 formatting so that escape sequences render correctly (e.g., `\n` becomes a new line, not the letter "n").

## 2. Goals

1. **Primary Goal**: Implement proper MarkdownV2 formatting for all bot messages
2. **Secondary Goal**: Fix escaped character rendering (e.g., `\n` → actual line break)
3. **Technical Goal**: Ensure all MarkdownV2 special characters are properly escaped/rendered
4. **Quality Goal**: Improve user experience with readable, professionally formatted messages

## 3. User Stories

### Primary User Story
**As a** bot user, **I want** to see properly formatted quota messages with correct line breaks and MarkdownV2 rendering **so that** I can easily read and understand my subscription information.

### Secondary User Stories
- **As a** bot user, **I want** all messages to use proper MarkdownV2 formatting **so that** I see formatted text instead of escape sequences
- **As a** bot user, **I want** consistent message formatting across all commands **so that** I have a predictable user experience
- **As a** bot administrator, **I want** clean, professionally formatted message output **so that** the bot appears reliable and well-built

## 4. Functional Requirements

1. **FR-1**: The bot must use proper MarkdownV2 formatting for all messages
2. **FR-2**: Line breaks (`\n`) must render as actual line breaks, not the literal text "n"
3. **FR-3**: All MarkdownV2 special characters must be properly escaped and rendered
4. **FR-4**: The `/quota` command must display messages with correct formatting
5. **FR-5**: Error messages must also use proper MarkdownV2 formatting
6. **FR-6**: The fix must not break existing functionality
7. **FR-7**: All bot commands must consistently use the same formatting approach

## 5. Acceptance Criteria

### AC-1: MarkdownV2 Line Break Rendering
- **Given** a message contains `\n` characters
- **When** the bot sends the message using MarkdownV2
- **Then** the `\n` should render as an actual line break
- **And** the user should not see the literal text "n"

### AC-2: Quota Command Display
- **Given** a user runs the `/quota` command
- **When** the bot responds with quota information
- **Then** the message should display with proper line breaks and MarkdownV2 formatting
- **And** no escaped characters should be visible as literal text

### AC-3: MarkdownV2 Special Characters
- **Given** a message contains MarkdownV2 special characters (_, *, [, ], (, ), ~, `, >, #, +, -, =, |, {, }, ., !)
- **When** the bot sends the message
- **Then** special characters should be properly escaped and rendered
- **And** the message should display with correct formatting

### AC-4: Error Message Display
- **Given** an error occurs during any command processing
- **When** the bot sends an error message
- **Then** the error message should use proper MarkdownV2 formatting
- **And** the message should be user-friendly and readable

### AC-5: Consistency Check
- **Given** the fix is implemented
- **When** testing all bot commands
- **Then** all messages should use consistent MarkdownV2 formatting
- **And** no regression in message formatting should occur

## 6. Non-Goals (Out of Scope)

- Changing the content of quota messages (only formatting)
- Modifying the quota calculation logic
- Adding new quota features
- Changing the command structure
- Switching to a different markdown format (must use MarkdownV2)
- Changing the Telegram Bot API integration

## 7. Technical Considerations

- **Files to Review**: 
  - `supabase/functions/enbot-webhook/commands/monthly-subscription-command.ts`
  - `supabase/functions/enbot-webhook/utils/markdown-utils.ts`
  - `supabase/functions/enbot-webhook/telegram-client.ts`
  - All command files that send messages
- **Dependencies**: Telegram Bot API MarkdownV2 specification
- **Key Technical Requirements**:
  - Proper escaping of MarkdownV2 special characters
  - Correct handling of line breaks (`\n`)
  - Consistent message formatting across all commands
- **Testing**: Must test with various message formats, special characters, and edge cases

## 8. Success Metrics

- **Primary**: 100% of messages use proper MarkdownV2 formatting with correct line breaks
- **Secondary**: No escaped characters visible as literal text in any bot messages
- **Technical**: All MarkdownV2 special characters are properly escaped and rendered
- **Quality**: User feedback indicates improved readability and professional appearance

## 9. Open Questions

1. Are there other commands with similar MarkdownV2 formatting issues?
2. Should we implement a comprehensive message formatting audit across all commands?
3. Do we need to update the markdown utility functions to handle all MarkdownV2 special characters?
4. Should we create a centralized message formatting service for consistency?
5. Are there any existing tests for message formatting that need to be updated?

## 10. Definition of Done

- [ ] All messages use proper MarkdownV2 formatting
- [ ] Line breaks (`\n`) render as actual line breaks, not literal "n"
- [ ] All MarkdownV2 special characters are properly escaped and rendered
- [ ] Quota command messages display correctly formatted
- [ ] Error messages use proper MarkdownV2 formatting
- [ ] All existing functionality remains intact
- [ ] Unit tests written and passing for message formatting
- [ ] Integration tests written and passing
- [ ] Code reviewed and approved
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated if needed
