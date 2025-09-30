# Task List: Improve Contact List with Role Assignment

## Relevant Files

- `supabase/migrations/20250121_040800_create_contacts_table.sql` - Current contacts table schema that needs role column added
- `supabase/migrations/[new_migration]_add_role_to_contacts.sql` - New migration to add role column and update existing contacts
- `supabase/functions/enbot-webhook/steps/person-name-step.ts` - Contact selection logic that needs role-based filtering
- `supabase/functions/enbot-webhook/commands/income-command.ts` - Income command that uses contact selection
- `supabase/functions/enbot-webhook/commands/outcome-command.ts` - Outcome command that uses contact selection  
- `supabase/functions/enbot-webhook/commands/creditnote-command.ts` - Credit note command that uses contact selection
- `supabase/functions/enbot-webhook/types.ts` - Type definitions that may need role-related types
- `supabase/functions/enbot-webhook/steps/person-name-step.test.ts` - Unit tests for person name step functionality

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests
- The role system will use: `famiglia`, `maestro`, `proprietario`, `fornitori`, `all` (default)
- Existing contacts will be migrated to `all` role to maintain backward compatibility

## Tasks

- [ ] 1.0 Database Schema Updates
  - [ ] 1.1 Create migration to add `role` column to contacts table with enum type ('famiglia', 'maestro', 'proprietario', 'fornitori', 'all')
  - [ ] 1.2 Set default value for `role` column to 'all'
  - [ ] 1.3 Update existing contacts to have 'all' role for backward compatibility
  - [ ] 1.4 Add database constraints and indexes for role-based queries
  - [ ] 1.5 Update table comments to document the role system

- [ ] 2.0 Contact Selection Logic Enhancement
  - [ ] 2.1 Update `loadContacts` function to accept role filter parameter
  - [ ] 2.2 Modify contact query to filter by role (specific role OR 'all' role)
  - [ ] 2.3 Update `ContactsPage` interface to include role information
  - [ ] 2.4 Enhance contact display to show role badges in the keyboard
  - [ ] 2.5 Update `createContactsKeyboard` to include role indicators
  - [ ] 2.6 Modify `saveNewContact` function to accept optional role parameter (defaults to 'all')

- [ ] 3.0 Command Integration Updates
  - [ ] 3.1 Update IncomeCommand to pass 'famiglia' role filter to contact selection
  - [ ] 3.2 Update OutcomeCommand to pass 'maestro' role filter to contact selection
  - [ ] 3.3 Update CreditNoteCommand to pass 'proprietario' role filter to contact selection
  - [ ] 3.4 Determine which command(s) should use 'fornitori' role filter (or if it should be available in all commands)
  - [ ] 3.5 Update all command step handlers to use role-filtered contact loading
  - [ ] 3.6 Ensure backward compatibility for existing sessions and workflows

- [ ] 4.0 Testing and Validation
  - [ ] 4.1 Create unit tests for role-based contact filtering
  - [ ] 4.2 Test contact creation with different roles
  - [ ] 4.3 Validate that existing contacts with 'all' role appear in all commands
  - [ ] 4.4 Test pagination with role-filtered results
  - [ ] 4.5 Verify database migration runs successfully
  - [ ] 4.6 Test end-to-end workflows for each command type
