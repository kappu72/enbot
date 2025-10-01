# EnB Bot Test Suite for AI Agents

## Overview
This test suite is designed to be executed by AI agents using the telegram-mcp server to comprehensively test all EnB bot functionality. The tests cover all commands, flows, validation scenarios, and edge cases.

## Test Environment Setup
- **Chat ID**: -1003125386565 (Test chat)
- **Bot**: @EnBlackBot
- **MCP Tools**: telegram-mcp server with integer chat_id schema

## Test Categories

### 1. Basic Commands Tests

#### 1.1 Help Command Test
**Test ID**: `HELP_001`
**Description**: Test help command functionality
**Steps**:
1. Send `/help` command
2. Verify response contains all available commands
3. Verify response contains usage instructions
4. Verify response contains transaction types explanation

**Expected Result**: Complete help message with all commands and instructions

#### 1.2 Start Command Test
**Test ID**: `START_001`
**Description**: Test start command (should redirect to help)
**Steps**:
1. Send `/start` command
2. Verify response is identical to help command

**Expected Result**: Same response as help command

### 2. Income Command Tests (`/entrata`)

#### 2.1 Income Flow - Quota Mensile (Standard Flow)
**Test ID**: `INCOME_001`
**Description**: Test income flow with Quota Mensile category (standard flow: Category → Person → Amount → Period)
**Steps**:
1. Send `/entrata` command
2. Verify category selection interface appears
3. Click "Quota" button
4. Verify contact selection interface appears
5. Select existing contact (e.g., "Cappugi")
6. Verify amount input interface appears
7. Reply to mention with amount "25.50"
8. Verify period selection interface appears
9. Select "OTT" (October) and "2025"
10. Verify transaction completion message

**Expected Result**: "Entrata Registrata" with correct details

#### 2.2 Income Flow - Quota Esame (Standard Flow)
**Test ID**: `INCOME_002`
**Description**: Test income flow with Quota Esame category (standard flow)
**Steps**:
1. Send `/entrata` command
2. Click "Esame" button
3. Select existing contact
4. Enter amount "30.00"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 2.3 Income Flow - Quota Iscrizione (Standard Flow)
**Test ID**: `INCOME_003`
**Description**: Test income flow with Quota Iscrizione category (standard flow)
**Steps**:
1. Send `/entrata` command
2. Click "Iscrizione" button
3. Select existing contact
4. Enter amount "100.00"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 2.4 Income Flow - Deposito Cauzionale (Standard Flow)
**Test ID**: `INCOME_004`
**Description**: Test income flow with Deposito Cauzionale category (standard flow)
**Steps**:
1. Send `/entrata` command
2. Click "D. cauzione" button
3. Select existing contact
4. Enter amount "200.00"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 2.5 Income Flow - Eventi Category (With Description)
**Test ID**: `INCOME_005`
**Description**: Test income flow with Eventi category (requires description: Category → Person → Amount → Description → Period)
**Steps**:
1. Send `/entrata` command
2. Click "Eventi" button
3. Select existing contact
4. Enter amount "50.00"
5. Verify description input appears
6. Enter description "Evento di beneficenza"
7. Select period (October 2025)
8. Verify completion

**Expected Result**: Transaction registered with description

#### 2.6 Income Flow - Altro Category (With Description)
**Test ID**: `INCOME_006`
**Description**: Test income flow with Altro category (requires description)
**Steps**:
1. Send `/entrata` command
2. Click "Altro" button
3. Select existing contact
4. Enter amount "75.00"
5. Verify description input appears
6. Enter description "Altra entrata"
7. Select period (October 2025)
8. Verify completion

**Expected Result**: Transaction registered with description

#### 2.7 Income Flow - New Contact Creation
**Test ID**: `INCOME_007`
**Description**: Test income flow with new contact creation
**Steps**:
1. Send `/entrata` command
2. Click "Quota" button
3. Click "➕ Nuovo" button
4. Enter new contact name "Mario Rossi"
5. Verify contact creation confirmation
6. Continue with amount and period
7. Verify completion

**Expected Result**: New contact created and transaction registered

#### 2.8 Income Flow - Contact Pagination
**Test ID**: `INCOME_008`
**Description**: Test contact list pagination
**Steps**:
1. Send `/entrata` command
2. Click "Quota" button
3. Navigate through contact pages using "▶️" and "◀️" buttons
4. Verify pagination works correctly
5. Select a contact from different pages

**Expected Result**: Pagination works, contact selection successful

### 3. Outcome Command Tests (`/uscita`)

#### 3.1 Outcome Flow - Cambusa (Standard Flow)
**Test ID**: `OUTCOME_001`
**Description**: Test outcome flow with Cambusa category (standard flow: Category → Amount → Description → Period)
**Steps**:
1. Send `/uscita` command
2. Verify outcome categories appear
3. Click "Cambusa" button
4. Verify amount input interface appears
5. Reply to mention with amount "15.75"
6. Verify description input appears
7. Enter description "Acquisto generi alimentari"
8. Select period (October 2025)
9. Verify completion

**Expected Result**: "Uscita Registrata" with correct details

#### 3.2 Outcome Flow - Circolo (Standard Flow)
**Test ID**: `OUTCOME_002`
**Description**: Test outcome flow with Circolo category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "Circolo" button
3. Enter amount "50.00"
4. Enter description "Spese circolo"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.3 Outcome Flow - Legna (Standard Flow)
**Test ID**: `OUTCOME_003`
**Description**: Test outcome flow with Legna category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "Legna" button
3. Enter amount "80.00"
4. Enter description "Acquisto legna"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.4 Outcome Flow - Manutenzione (Standard Flow)
**Test ID**: `OUTCOME_004`
**Description**: Test outcome flow with Manutenzione category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "Manutenzione" button
3. Enter amount "150.00"
4. Enter description "Manutenzione ordinaria"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.5 Outcome Flow - Materiale Didattico (Standard Flow)
**Test ID**: `OUTCOME_005`
**Description**: Test outcome flow with Materiale Didattico category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "M. didattico" button
3. Enter amount "25.00"
4. Enter description "Materiale didattico"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.6 Outcome Flow - Pronto Soccorso (Standard Flow)
**Test ID**: `OUTCOME_006`
**Description**: Test outcome flow with Pronto Soccorso category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "P. soccorso" button
3. Enter amount "30.00"
4. Enter description "Pronto soccorso"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.7 Outcome Flow - Pulizie (Standard Flow)
**Test ID**: `OUTCOME_007`
**Description**: Test outcome flow with Pulizie category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "Pulizie" button
3. Enter amount "40.00"
4. Enter description "Servizio pulizie"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.8 Outcome Flow - Altro (Standard Flow)
**Test ID**: `OUTCOME_008`
**Description**: Test outcome flow with Altro category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "Altro" button
3. Enter amount "60.00"
4. Enter description "Altra spesa"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.9 Outcome Flow - Utenza Luce (Standard Flow)
**Test ID**: `OUTCOME_009`
**Description**: Test outcome flow with Utenza Luce category (standard flow)
**Steps**:
1. Send `/uscita` command
2. Click "Utenza Luce" button
3. Enter amount "120.00"
4. Enter description "Bolletta luce"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 3.10 Outcome Flow - Stipendi Contributi (With Person Name)
**Test ID**: `OUTCOME_010`
**Description**: Test outcome flow with Stipendi Contributi category (requires person name: Category → Person → Amount → Description → Period)
**Steps**:
1. Send `/uscita` command
2. Click "Stipendio" button
3. Verify person name selection interface appears
4. Select or create contact for person name
5. Enter amount "1200.00"
6. Enter description "Stipendio mensile"
7. Select period (October 2025)
8. Verify completion

**Expected Result**: Transaction registered with person name

#### 3.11 Outcome Flow - Rimborsi (With Person Name)
**Test ID**: `OUTCOME_011`
**Description**: Test outcome flow with Rimborsi category (requires person name)
**Steps**:
1. Send `/uscita` command
2. Click "Rimborsi" button
3. Verify person name selection interface appears
4. Select or create contact for person name
5. Enter amount "100.00"
6. Enter description "Rimborso spese"
7. Select period (October 2025)
8. Verify completion

**Expected Result**: Transaction registered with person name

#### 3.12 Outcome Flow - Straordinaria Manutenzione (With Person Name)
**Test ID**: `OUTCOME_012`
**Description**: Test outcome flow with Straordinaria Manutenzione category (requires person name)
**Steps**:
1. Send `/uscita` command
2. Click "M. straordinaria" button
3. Verify person name selection interface appears
4. Select or create contact for person name
5. Enter amount "300.00"
6. Enter description "Manutenzione straordinaria"
7. Select period (October 2025)
8. Verify completion

**Expected Result**: Transaction registered with person name

### 4. Credit Note Command Tests (`/notacredito`)

#### 4.1 Credit Note Flow - IMU (Standard Flow)
**Test ID**: `CREDITNOTE_001`
**Description**: Test credit note flow with IMU category (standard flow: Category → Amount → Description → Period)
**Steps**:
1. Send `/notacredito` command
2. Verify credit note categories appear
3. Click "IMU" button
4. Verify amount input interface appears
5. Reply to mention with amount "500.00"
6. Verify description input appears
7. Enter description "IMU annuale"
8. Select period (October 2025)
9. Verify completion

**Expected Result**: "Nota di credito registrata" with correct details

#### 4.2 Credit Note Flow - Tari (Standard Flow)
**Test ID**: `CREDITNOTE_002`
**Description**: Test credit note flow with Tari category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Tari" button
3. Enter amount "200.00"
4. Enter description "Tassa rifiuti"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.3 Credit Note Flow - Acqua (Standard Flow)
**Test ID**: `CREDITNOTE_003`
**Description**: Test credit note flow with Acqua category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Acqua" button
3. Enter amount "80.00"
4. Enter description "Bolletta acqua"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.4 Credit Note Flow - Webcolf (Standard Flow)
**Test ID**: `CREDITNOTE_004`
**Description**: Test credit note flow with Webcolf category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Webcolf" button
3. Enter amount "150.00"
4. Enter description "Servizio Webcolf"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.5 Credit Note Flow - Utenza co (Standard Flow)
**Test ID**: `CREDITNOTE_005`
**Description**: Test credit note flow with Utenza co category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Utenza co" button
3. Enter amount "100.00"
4. Enter description "Utenza condominiale"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.6 Credit Note Flow - Cambusa (Standard Flow)
**Test ID**: `CREDITNOTE_006`
**Description**: Test credit note flow with Cambusa category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Cambusa" button
3. Enter amount "60.00"
4. Enter description "Cambusa"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.7 Credit Note Flow - Manutenzione (Standard Flow)
**Test ID**: `CREDITNOTE_007`
**Description**: Test credit note flow with Manutenzione category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Manutenzione" button
3. Enter amount "200.00"
4. Enter description "Manutenzione"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.8 Credit Note Flow - Materiale Didattico (Standard Flow)
**Test ID**: `CREDITNOTE_008`
**Description**: Test credit note flow with Materiale Didattico category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "M. didattico" button
3. Enter amount "30.00"
4. Enter description "Materiale didattico"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.9 Credit Note Flow - Pronto Soccorso (Standard Flow)
**Test ID**: `CREDITNOTE_009`
**Description**: Test credit note flow with Pronto Soccorso category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "P. soccorso" button
3. Enter amount "40.00"
4. Enter description "Pronto soccorso"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.10 Credit Note Flow - Pulizie (Standard Flow)
**Test ID**: `CREDITNOTE_010`
**Description**: Test credit note flow with Pulizie category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Pulizie" button
3. Enter amount "50.00"
4. Enter description "Pulizie"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.11 Credit Note Flow - Stipendio (Standard Flow)
**Test ID**: `CREDITNOTE_011`
**Description**: Test credit note flow with Stipendio category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Stipendio" button
3. Enter amount "800.00"
4. Enter description "Stipendio"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.12 Credit Note Flow - Eventi (Standard Flow)
**Test ID**: `CREDITNOTE_012`
**Description**: Test credit note flow with Eventi category (standard flow)
**Steps**:
1. Send `/notacredito` command
2. Click "Eventi" button
3. Enter amount "100.00"
4. Enter description "Eventi"
5. Select period (October 2025)
6. Verify completion

**Expected Result**: Transaction registered successfully

#### 4.13 Credit Note Flow - Spese Varie (With Description)
**Test ID**: `CREDITNOTE_013`
**Description**: Test credit note flow with Spese Varie category (requires description: Category → Amount → Description → Period)
**Steps**:
1. Send `/notacredito` command
2. Click "Spese Varie" button
3. Enter amount "75.00"
4. Verify description input appears
5. Enter description "Spese varie dettagliate"
6. Select period (October 2025)
7. Verify completion

**Expected Result**: Transaction registered with description

### 5. Validation Tests

#### 5.1 Amount Validation Tests
**Test ID**: `VALIDATION_001`
**Description**: Test amount input validation
**Test Cases**:
1. Valid amounts: "25.50", "25,50", "100", "0.01"
2. Invalid amounts: "0", "-10", "abc", "10001", ""

**Steps**: For each test case, try to enter the amount and verify appropriate response

**Expected Results**:
- Valid amounts: Accepted and processed
- Invalid amounts: Error message displayed

#### 5.2 Contact Name Validation Tests
**Test ID**: `VALIDATION_002`
**Description**: Test contact name validation
**Test Cases**:
1. Valid names: "Mario Rossi", "Anna & Marco", "José María"
2. Invalid names: "", "A", "Mario123", "Mario@Rossi", "   "

**Steps**: Try to create new contacts with each test case

**Expected Results**:
- Valid names: Contact created successfully
- Invalid names: Error message displayed

#### 5.3 Description Validation Tests
**Test ID**: `VALIDATION_003`
**Description**: Test description input validation
**Test Cases**:
1. Valid descriptions: "Spesa per eventi", "Acquisto materiale"
2. Edge cases: Very long descriptions, special characters

**Steps**: Enter descriptions in required fields and verify handling

**Expected Results**: Descriptions accepted or appropriate error messages

### 6. Error Handling Tests

#### 6.1 Session Recovery Tests
**Test ID**: `ERROR_001`
**Description**: Test session recovery when starting new command during active session
**Steps**:
1. Start income command
2. Select category
3. Start new outcome command
4. Verify previous session is cleaned up
5. Complete new command

**Expected Result**: New command starts cleanly, old session cleared

#### 6.2 Invalid Button Clicks
**Test ID**: `ERROR_002`
**Description**: Test handling of invalid button clicks
**Steps**:
1. Start any command
2. Try to click buttons from previous messages
3. Verify appropriate error handling

**Expected Result**: Invalid clicks ignored or handled gracefully

#### 6.3 Message Threading Tests
**Test ID**: `ERROR_003`
**Description**: Test proper message threading for replies
**Steps**:
1. Start any command requiring text input
2. Send text without replying to mention
3. Send text with proper reply to mention
4. Verify only proper replies are processed

**Expected Result**: Only properly threaded replies are processed

### 7. Edge Case Tests

#### 7.1 Rapid Command Execution
**Test ID**: `EDGE_001`
**Description**: Test rapid execution of multiple commands
**Steps**:
1. Execute multiple commands in quick succession
2. Verify each command completes properly
3. Verify no session conflicts

**Expected Result**: All commands execute successfully

#### 7.2 Long Transaction Names
**Test ID**: `EDGE_002`
**Description**: Test with very long contact names and descriptions
**Steps**:
1. Create contact with maximum length name
2. Enter maximum length description
3. Complete transaction

**Expected Result**: Transaction completes successfully

#### 7.3 Special Characters
**Test ID**: `EDGE_003`
**Description**: Test with special characters in names and descriptions
**Steps**:
1. Use special characters in contact names
2. Use special characters in descriptions
3. Verify proper handling

**Expected Result**: Special characters handled correctly

### 8. Integration Tests

#### 8.1 Database Integration
**Test ID**: `INTEGRATION_001`
**Description**: Verify transactions are properly stored in database
**Steps**:
1. Complete various transactions
2. Verify data appears in database
3. Check data integrity

**Expected Result**: All data properly stored and retrievable

#### 8.2 Google Sheets Integration
**Test ID**: `INTEGRATION_002`
**Description**: Verify transactions sync to Google Sheets
**Steps**:
1. Complete transactions
2. Check Google Sheets for new entries
3. Verify data accuracy

**Expected Result**: Data properly synced to Google Sheets

## Test Execution Guidelines

### For AI Agents:

1. **Use the telegram-mcp tools**:
   - `send_message` for sending commands and text
   - `get_messages` for reading bot responses
   - `get_message_buttons` for checking available buttons
   - `click_inline_button` for clicking buttons
   - `get_chat_info` for chat information

2. **Follow the test sequence**:
   - Execute tests in order
   - Wait for bot responses before proceeding
   - Verify each step before moving to next

3. **Handle errors gracefully**:
   - If a test fails, document the failure
   - Continue with remaining tests
   - Report all failures at the end

4. **Document results**:
   - Record pass/fail for each test
   - Note any unexpected behaviors
   - Capture error messages

### Test Data Requirements:

- **Test Chat**: Must have access to chat ID -1003125386565
- **Bot Access**: Bot must be active and responsive
- **Database**: Must have proper database connection
- **Google Sheets**: Must have Google Sheets integration active

## Success Criteria

A test suite execution is considered successful if:
- All basic command tests pass
- All flow tests complete successfully
- Validation tests properly reject invalid inputs
- Error handling tests demonstrate proper error management
- Integration tests verify data persistence
- No critical errors occur during execution

## Flow Patterns Summary

### Income Command Flow Patterns
- **Standard Flow**: Category → Person → Amount → Period
  - Categories: Quota Mensile, Quota Esame, Quota Iscrizione, Deposito Cauzionale
- **With Description Flow**: Category → Person → Amount → Description → Period
  - Categories: Eventi, Altro

### Outcome Command Flow Patterns
- **Standard Flow**: Category → Amount → Description → Period
  - Categories: Cambusa, Circolo, Legna, Manutenzione, Materiale Didattico, Pronto Soccorso, Pulizie, Altro, Utenza Luce
- **With Person Name Flow**: Category → Person → Amount → Description → Period
  - Categories: Stipendi Contributi, Rimborsi, Straordinaria Manutenzione

### Credit Note Command Flow Patterns
- **Standard Flow**: Category → Amount → Description → Period
  - Categories: IMU, Tari, Acqua, Webcolf, Utenza co, Cambusa, Manutenzione, Materiale Didattico, Pronto Soccorso, Pulizie, Stipendio, Eventi
- **With Description Flow**: Category → Amount → Description → Period
  - Categories: Spese Varie (requires description input)

### Test Coverage Summary
- **Total Test Cases**: 50+
- **Income Tests**: 8 test cases covering all 6 categories
- **Outcome Tests**: 12 test cases covering all 12 categories
- **Credit Note Tests**: 13 test cases covering all 13 categories
- **Validation Tests**: 3 test cases for input validation
- **Error Handling Tests**: 3 test cases for error scenarios
- **Edge Case Tests**: 3 test cases for edge scenarios
- **Integration Tests**: 2 test cases for data persistence

## Reporting

After test execution, provide:
1. **Summary**: Total tests run, passed, failed
2. **Failed Tests**: List of failed tests with error details
3. **Flow Pattern Coverage**: Which flow patterns were tested successfully
4. **Category Coverage**: Which categories were tested for each command
5. **Unexpected Behaviors**: Any behaviors not covered in test cases
6. **Recommendations**: Suggestions for improvements or fixes
