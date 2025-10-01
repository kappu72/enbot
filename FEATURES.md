# EnBot Feature Roadmap & Improvements

## 🚀 High Priority Features

### Database Functions & Performance
- [ ] **Session Cleanup Automation**
  - Implement `clean_expired_sessions()` PostgreSQL function
  - Add automated cleanup job/schedule
  - Follow `create-db-functions.mdc` guidelines
  - **Priority**: High | **Effort**: Medium

- [ ] **Transaction Statistics Function**
  - Create `get_transaction_stats()` function for reporting
  - Support filtering by user, chat, date range
  - Return aggregated data (totals, averages, category breakdown)
  - **Priority**: Medium | **Effort**: High

- [ ] **Contact Search Optimization**
  - Implement `search_contacts()` with pagination
  - Add fuzzy search capabilities
  - Improve contact selection UX
  - **Priority**: Medium | **Effort**: Medium

- [ ] **Improve contact list with role assignment**
  - Add `role` field to contacts table (famiglia, maestro, proprietario)
  - Update contact creation/editing flow to include role selection
  - Modify contact display to show roles
  - Add role-based filtering in contact selection
  - **Priority**: Medium | **Effort**: Medium

### Bot Functionality

- [X] **Implement "entrate cassa" command**
  - Create new EntrateCassaCommand class for cash inflows
  - Add step-by-step flow for cash income entry
  - Add validation for positive amounts
  - Store transactions in database with proper categorization
  - **Priority**: High | **Effort**: Medium

- [X] **Implement "uscite cassa" command**
  - Create new UsciteCassaCommand class for cash outflows
  - Add step-by-step flow for cash expense entry
  - Add validation for positive amounts
  - Store transactions in database with proper categorization
  - **Priority**: High | **Effort**: Medium

- [X] **Implement "note di credito" command**
  - Create new NoteDiCreditoCommand class for credit notes
  - Add step-by-step flow for credit note entry
  - Add validation for negative amounts (credits)
  - Link to original transaction if applicable
  - **Priority**: Medium | **Effort**: Medium

- [ ] **Transaction History Command**
  - Add `/history` command to show recent transactions
  - Implement pagination for large result sets
  - Add filtering options (by date, category, amount)
  - **Priority**: High | **Effort**: Medium

- [ ] **Bulk Operations**
  - Add `/sync-sheets` command for manual Google Sheets sync
  - Implement bulk transaction export
  - Add data backup/restore functionality
  - **Priority**: Medium | **Effort**: High

- [ ] **Admin Commands**
  - Add `/admin` command for bot management
  - Implement session cleanup commands
  - Add user management features
  - **Priority**: Low | **Effort**: Medium

## 🔧 Technical Improvements

### Code Quality
- [ ] **Migrate to Grammy.js v1.21.1**
  - Replace custom TelegramClient with Grammy.js framework
  - Update all bot interactions to use Grammy's API
  - Implement proper middleware and context handling
  - Add type safety improvements with Grammy's TypeScript support
  - Update webhook handling and message processing
  - **Priority**: High | **Effort**: High

- [ ] **Error Handling Enhancement**
  - Standardize error messages across all commands
  - Add retry mechanisms for failed operations
  - Implement better logging and monitoring
  - **Priority**: Medium | **Effort**: Medium

- [ ] **Testing Infrastructure**
  - Add unit tests for command classes
  - Implement integration tests for database operations
  - Add end-to-end tests for bot workflows
  - **Priority**: High | **Effort**: High

- [ ] **Performance Optimization**
  - Optimize database queries with proper indexing
  - Implement connection pooling
  - Add caching for frequently accessed data
  - **Priority**: Medium | **Effort**: Medium

### Security & Reliability
- [ ] **Enhanced Security**
  - Implement rate limiting for bot commands
  - Add input validation and sanitization
  - Enhance RLS policies for better data protection
  - **Priority**: High | **Effort**: Medium

- [ ] **Monitoring & Alerting**
  - Add health check endpoints
  - Implement error tracking and alerting
  - Add performance metrics collection
  - **Priority**: Medium | **Effort**: High

## 📱 User Experience

### Interface Improvements
- [x] **Implement message cleanup after successful command completion**
  - Remove all messages except the last one after successful command execution
  - Implement message deletion functionality in TelegramClient
  - Add cleanup logic after successful command execution
  - Ensure proper error handling for message deletion failures
  - Add descriptions to uscite command notification message
  - **Enhance outcome notification messages to include user-provided descriptions**
  - **Priority**: Medium | **Effort**: Medium

- [ ] **Better Error Messages**
  - Make error messages more user-friendly
  - Add helpful suggestions for common mistakes
  - Implement contextual help system
  - **Priority**: Medium | **Effort**: Low

- [ ] **Command Shortcuts**
  - Add keyboard shortcuts for common operations
  - Implement command aliases
  - Add quick action buttons
  - **Priority**: Low | **Effort**: Low

### Documentation
- [ ] **User Guide**
  - Create comprehensive user documentation
  - Add video tutorials for common workflows
  - Implement in-bot help system
  - **Priority**: Medium | **Effort**: Medium

## 🎨 Future Enhancements

### Advanced Features
- [ ] **Multi-language Support**
  - Add internationalization (i18n)
  - Support multiple languages for bot responses
  - **Priority**: Low | **Effort**: High

- [ ] **Advanced Reporting**
  - Add graphical reports and charts
  - Implement data export in multiple formats
  - Add scheduled report generation
  - **Priority**: Low | **Effort**: High

- [ ] **Integration Enhancements**
  - Add more Google Sheets features
  - Implement webhook notifications
  - Add API endpoints for external integrations
  - **Priority**: Low | **Effort**: High

---

## 📋 How to Use This List

1. **Adding New Features**: Add items with priority and effort estimates
2. **Tracking Progress**: Update checkboxes as items are completed
3. **Prioritization**: Use Priority (High/Medium/Low) and Effort (High/Medium/Low) to plan sprints
4. **Linking**: Reference GitHub issues or PRs in descriptions

## 🏷️ Labels Legend
- **Priority**: High (Critical), Medium (Important), Low (Nice to have)
- **Effort**: High (Complex), Medium (Moderate), Low (Simple)
- **Status**: Use GitHub issues for detailed tracking
