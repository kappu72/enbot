# Documentazione Comando Outcome - EnB Bot

## Panoramica

Il comando `/uscita` del bot EnB permette di registrare nuove uscite finanziarie con un flusso interattivo che si adatta dinamicamente in base alla categoria selezionata.

## Categorie Disponibili

Il comando outcome supporta 12 categorie principali (aggiornate dal database):

| Categoria | Label | Descrizione | Richiede Contatto |
|-----------|-------|-------------|-------------------|
| **Rimborsi** | Rimborsi | Rimborsi e restituzioni | ✅ Sì |
| **Stipendi contributi** | Stipendio | Stipendi e contributi | ✅ Sì |
| **Cambusa** | Cambusa | Spese per cambusa | ❌ No |
| **Circolo Arci** | Circolo | Spese per circolo | ❌ No |
| **Legna** | Legna | Spese per legna | ❌ No |
| **Manutenzione** | Manutenzione | Spese di manutenzione ordinaria | ❌ No |
| **Eventi** | Eventi | Movimenti relativi ad eventi | ❌ No |
| **Materiale didattico** | M. didattico | Materiale per didattica | ❌ No |
| **Pronto Soccorso** | P. soccorso | Spese pronto soccorso | ❌ No |
| **Pulizie** | Pulizie | Spese per pulizie | ❌ No |
| **Spese Varie** | Altro | Altre spese varie | ❌ No |
| **Straordinaria manutenzione** | M. straordinaria | Manutenzione straordinaria | ❌ No |

## Differenze nel Flusso

### Flusso Standard (10 categorie)
```
Categoria → Importo → Descrizione → Periodo → Completamento
```

**Categorie coinvolte:**
- Cambusa
- Circolo Arci
- Legna
- Manutenzione
- Eventi
- Materiale didattico
- Pronto Soccorso
- Pulizie
- Spese Varie
- Straordinaria manutenzione

### Flusso con Contatto (2 categorie)
```
Categoria → Nome persona → Importo → Descrizione → Periodo → Completamento
```

**Categorie coinvolte:**
- Rimborsi
- Stipendi contributi

**Differenza chiave:** Queste categorie richiedono obbligatoriamente la selezione del contatto (persona/famiglia) prima dell'importo.

## Logica di Filtraggio Contatti

### Ruoli Disponibili per Outcome
- 👨‍👩‍👧‍👦 **Famiglia** - Contatti familiari (genitori, studenti)
- 🏢 **Proprietario** - Proprietari/amministratori
- 👨‍🏫 **Maestro** - Insegnanti/maestri
- 🏪 **Fornitore** - Fornitori (ruolo principale per uscite)

### Assegnazione Ruoli per Categoria

#### Categorie con Contatti "Fornitore" (Default)
Mostrano **solo contatti con ruolo fornitore** (comportamento di default per outcome):
- Cambusa
- Circolo Arci
- Legna
- Manutenzione
- Materiale didattico
- Pronto Soccorso
- Pulizie
- Spese Varie
- Utenza Luce

#### Categorie con Contatti "Multi-ruolo"
Mostrano contatti con **più ruoli** (famiglia, proprietario, maestro):
- Stipendi contributi
- Straordinaria manutenzione

## Configurazione Ruoli

```typescript
const ROLE_REQUIREMENTS = {
  'uscita': {
    defaultRoles: [ROLES.Fornitore],
    categoryRoles: {
      [ROLES.Proprietario]: ['Straordinaria manutenzione'], // Rimosso - ora usa fornitore di default
      [ROLES.Maestro]: ['Stipendi contributi'],
      [ROLES.Multi]: ['Rimborsi'], // famiglia, proprietario, maestro
    },
  },
}
```

## Comportamento dell'Interfaccia

### Messaggi di Filtraggio
L'interfaccia informa l'utente sui filtri attivi:

**Per categorie fornitore (default):**
```
🔍 Contatti filtrati per: 🏪 Fornitore
📂 Categoria: Cambusa
🎯 Comando: Uscita
```

**Per categorie stipendi:**
```
🔍 Contatti filtrati per: 👨‍🏫 Maestro
📂 Categoria: Stipendi contributi
🎯 Comando: Uscita
```

**Per tutte le altre categorie (inclusa Straordinaria manutenzione):**
```
🔍 Contatti filtrati per: 🏪 Fornitore
📂 Categoria: Straordinaria manutenzione
🎯 Comando: Uscita
```

## Differenze Chiave rispetto al Comando Income

### 1. Descrizione Sempre Richiesta
**Income:** Solo categorie "Eventi" e "Altro" richiedono descrizione
**Outcome:** **TUTTE** le categorie richiedono descrizione

### 2. Logica Contatti
**Income:** Default "famiglia", speciale "multi-ruolo" per Eventi/Altro
**Outcome:** Default "fornitore", speciale per stipendi (maestro) e manutenzione (proprietario)

### 3. Flusso Dopo Categoria
**Income:** Sempre Nome persona → Importo → [Descrizione] → Periodo
**Outcome:** [Nome persona] → Importo → Descrizione → Periodo

### 4. Comportamento Importo
**Income:** Dopo importo va a descrizione solo per alcune categorie
**Outcome:** Dopo importo va **SEMPRE** a descrizione

## Flussi Dettagliati per Categoria

### 1. Cambusa (Flusso Standard)
```
1. Categoria: "Cambusa"
2. Contatti: Solo ruolo "fornitore"
3. Importo: Inserimento numerico
4. Descrizione: Campo obbligatorio
5. Periodo: Selezione mese/anno
6. Salvataggio: Transazione completata
```

### 2. Stipendi contributi (Flusso con Contatto)
```
1. Categoria: "Stipendi contributi"
2. Contatti: Solo ruolo "maestro"
3. Importo: Inserimento numerico
4. Descrizione: Campo obbligatorio
5. Periodo: Selezione mese/anno
6. Salvataggio: Transazione completata
```

### 3. Straordinaria manutenzione (Flusso Standard)
```
1. Categoria: "Straordinaria manutenzione"
2. Contatti: Solo ruolo "fornitore" (default)
3. Importo: Inserimento numerico
4. Descrizione: Campo obbligatorio
5. Periodo: Selezione mese/anno
6. Salvataggio: Transazione completata
```

## Validazione e Vincoli

### Validazione Importo
- Deve essere un numero positivo
- Massimo 2 decimali
- Formato: `123.45` o `123`

### Validazione Descrizione (Sempre Richiesta)
- Campo obbligatorio per **tutte** le categorie
- Massimo 500 caratteri
- Può contenere lettere, numeri, spazi, punteggiatura

### Validazione Contatti (Solo per categorie che lo richiedono)
- Nome: 2-50 caratteri
- Solo lettere, spazi, apostrofi, trattini, &
- Deve contenere almeno una lettera

## Messaggi di Conferma

### Completamento Transazione
```
🔔 Uscita Registrata

Spesi *€123,45* per Cambusa di Gennaio 2024 da Mario Rossi

Registrato da: [Username]

Grazie da EnB
```

## Errori Comuni

### Errori di Validazione
- **Importo non valido:** "Errore nella validazione dell'importo"
- **Descrizione vuota:** "Errore nella validazione della descrizione" (più comune in outcome)
- **Nome contatto non valido:** "Il nome deve contenere almeno una lettera"

### Errori di Sistema
- **Categoria non trovata:** "Category not found"
- **Errore salvataggio:** "Errore durante il salvataggio dell'uscita"
- **Sincronizzazione fallita:** "Uscita salvata ma sincronizzazione con Google Sheets fallita"

## Integrazione Google Sheets

Le transazioni vengono automaticamente sincronizzate con Google Sheets per:
- Backup dei dati
- Reportistica
- Analisi finanziaria

In caso di errori di sincronizzazione, il sistema ritenta automaticamente e informa l'utente.

## Schema Database

### Tabella Transactions
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  payload JSONB, -- Contiene tutti i dati della transazione
  created_by_user_id INTEGER,
  command_type VARCHAR(50),
  is_synced BOOLEAN DEFAULT FALSE,
  chat_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabella Categories (Esempio categorie outcome)
```sql
-- Esempi di categorie outcome nel database:
INSERT INTO categories (name, label, description, is_active, sort_order) VALUES
('Cambusa', 'Cambusa', 'Spese per cambusa', true, 1),
('Stipendi contributi', 'Stipendio', 'Stipendi e contributi', true, 9),
('Straordinaria manutenzione', 'M. straordinaria', 'Manutenzione straordinaria', true, 10);
```

## Differenze Architetturali da Income

### 1. Metodo `requiresPersonNameStep()`
```typescript
private requiresPersonNameStep(categoryName: string): boolean {
  return categoryName === 'Stipendi contributi' ||
    categoryName === 'Rimborsi' ||
    categoryName === 'Straordinaria manutenzione';
}
```

### 2. Flusso Sempre con Descrizione
```typescript
// Nel metodo handleAmountInputWithStep:
session.transactionData.amount = result.processedValue;
session.step = STEPS.Description; // Sempre descrizione dopo importo

// Nel messaggio di conferma:
const notificationMessage = `Spesi *${formatCurrencyMarkdownV2(transactionPayload.amount as number)}* per ${boldMarkdownV2(escapeMarkdownV2(categoryName))} di ${boldMarkdownV2(monthName)} ${boldMarkdownV2(transactionPayload.year as string)}${familyName ? ` da ${boldMarkdownV2(familyName)}` : ''}\n\nRegistrato da: ${boldMarkdownV2(recordedBy)}\n\nGrazie da EnB`;
```

### 3. Gestione Contatti Condizionale
- Se categoria richiede contatto: mostra passo persona prima dell'importo
- Se categoria non richiede contatto: salta direttamente all'importo

## Manutenzione e Estensione

### Aggiungere Nuove Categorie
1. Inserire in tabella `categories`
2. Associare a `category_types` (id = 'outcome')
3. Definire ruoli richiesti in `ROLE_REQUIREMENTS`
4. Implementare logica `requiresPersonNameStep()` se necessario
5. Testare flusso completo

### Modificare Logica Ruoli
Aggiornare la configurazione `ROLE_REQUIREMENTS` in `person-name-step.ts` e ridistribuire il bot.

## Troubleshooting

### Problemi Comuni
1. **Contatti non visibili:** Verificare assegnazione ruoli corretta (principalmente "fornitore")
2. **Flusso interrotto:** Controllare validazione categorie e logica `requiresPersonNameStep()`
3. **Descrizione sempre richiesta:** Comportamento normale per outcome (a differenza di income)
4. **Categoria "Rimborsi" non disponibile:** Categoria pianificata ma non ancora implementata nel database

### Debug Categorie
Per verificare categorie disponibili nel database:
```sql
SELECT c.id, c.name, c.label, ct.name as type
FROM categories c
JOIN category_type_assignments cta ON c.id = cta.category_id
JOIN category_types ct ON cta.category_type_id = ct.id
WHERE ct.name = 'outcome'
ORDER BY c.sort_order;
```

### Log di Debug
Il sistema genera log dettagliati per ogni passo:
- Selezione categoria
- Filtraggio contatti
- Validazione importo/descrizione
- Salvataggio transazione
- Sincronizzazione Google Sheets
