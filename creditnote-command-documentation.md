# Documentazione Comando CreditNote - EnB Bot

## Panoramica

Il comando `/notacredito` del bot EnB permette di registrare nuove note di credito con un flusso interattivo che si adatta dinamicamente in base alla categoria selezionata.

## Categorie Disponibili

Il comando creditNote supporta 12 categorie principali (aggiornate dal database):

| Categoria | Label | Descrizione | Richiede Descrizione |
|-----------|-------|-------------|---------------------|
| **Stipendi contributi** | Stipendio | Stipendi e contributi | ❌ No |
| **Cambusa** | Cambusa | Spese per cambusa | ❌ No |
| **Materiale didattico** | M. didattico | Materiale per didattica | ❌ No |
| **Manutenzione** | Manutenzione | Spese di manutenzione ordinaria | ❌ No |
| **IMU** | IMU | Imposta Municipale Unica | ❌ No |
| **Utenza Tari** | Tari | Tassa sui rifiuti | ❌ No |
| **Utenza Acqua** | Acqua | Spese per utenza acqua | ❌ No |
| **Spese Varie** | Altro | Altre spese varie | ✅ Sì |
| **Consorzio bonifica** | C. Bonifica | Consorzio di bonifica | ❌ No |
| **Pronto Soccorso** | P. soccorso | Spese pronto soccorso | ❌ No |
| **Pulizie** | Pulizie | Spese per pulizie | ❌ No |
| **Webcolf** | Webcolf | Servizio Webcolf | ❌ No |

## Flusso del Comando

### Flusso Standard (11 categorie)
```
Categoria → Nome persona → Importo → Periodo → Completamento
```

**Categorie coinvolte:**
- Stipendi contributi
- Cambusa
- Materiale didattico
- Manutenzione
- IMU
- Utenza Tari
- Utenza Acqua
- Consorzio bonifica
- Pronto Soccorso
- Pulizie
- Webcolf

### Flusso con Descrizione (1 categoria)
```
Categoria → Nome persona → Importo → Descrizione → Periodo → Completamento
```

**Categoria coinvolta:**
- Spese Varie (Altro)

**Differenza chiave:** Solo "Spese Varie" richiede obbligatoriamente il campo descrizione per fornire maggiori dettagli sulla nota di credito.

## Logica di Filtraggio Contatti

### Ruoli Disponibili per CreditNote
Il comando creditNote utilizza **tutti i ruoli disponibili**:
- 👨‍👩‍👧‍👦 **Famiglia** - Contatti familiari (genitori, studenti)
- 🏢 **Proprietario** - Proprietari/amministratori
- 👨‍🏫 **Maestro** - Insegnanti/maestri
- 🏪 **Fornitore** - Fornitori

### Configurazione Ruoli

```typescript
const ROLE_REQUIREMENTS = {
  'notadicredito': {
    defaultRoles: [
      ROLES.Famiglia,
      ROLES.Proprietario,
      ROLES.Maestro,
    ], // All categories
    categoryRoles: {} as Record<string, string[]>,
  },
}
```

**Comportamento:** Per le note di credito vengono mostrati **tutti i tipi di contatto** disponibili, indipendentemente dalla categoria selezionata.

## Comportamento dell'Interfaccia

### Messaggi di Filtraggio
L'interfaccia informa l'utente sui filtri attivi:

```
🔍 Contatti filtrati per: 👨‍👩‍👧‍👦 Famiglia, 🏢 Proprietario, 👨‍🏫 Maestro
📂 Categoria: IMU
🎯 Comando: Nota di Credito
```

## Differenze Chiave rispetto ad Income e Outcome

### 1. Descrizione Condizionale
**Income:** Solo Eventi/Altro richiedono descrizione
**Outcome:** **Sempre** richiesta descrizione
**CreditNote:** Solo "Spese Varie" richiede descrizione

### 2. Selezione Contatto
**Income:** Sempre richiesta dopo categoria
**Outcome:** Condizionale (solo per alcune categorie)
**CreditNote:** **Sempre richiesta** dopo categoria

### 3. Filtri Contatti
**Income:** Default famiglia, speciale multi-ruolo
**Outcome:** Default fornitore, speciale per stipendi/manutenzione
**CreditNote:** **Tutti i ruoli sempre disponibili**

### 4. Categorie Totali
**Income:** 6 categorie
**Outcome:** 11 categorie
**CreditNote:** 12 categorie (include categorie da tutti i comandi)

## Flussi Dettagliati per Categoria

### 1. Stipendi contributi (Flusso Standard)
```
1. Categoria: "Stipendi contributi"
2. Contatti: Tutti i ruoli disponibili
3. Importo: Inserimento numerico
4. Periodo: Selezione mese/anno
5. Salvataggio: Nota di credito completata
```

### 2. Spese Varie (Flusso con Descrizione)
```
1. Categoria: "Spese Varie"
2. Contatti: Tutti i ruoli disponibili
3. Importo: Inserimento numerico
4. Descrizione: Campo obbligatorio per dettagli generici
5. Periodo: Selezione mese/anno
6. Salvataggio: Nota di credito completata
```

### 3. IMU (Flusso Standard)
```
1. Categoria: "IMU"
2. Contatti: Tutti i ruoli disponibili
3. Importo: Inserimento numerico
4. Periodo: Selezione mese/anno
5. Salvataggio: Nota di credito completata
```

## Configurazione Descrizione Condizionale

```typescript
private requiresDescriptionStep(categoryName: string): boolean {
  return categoryName === 'Spese Varie';
}
```

## Validazione e Vincoli

### Validazione Importo
- Deve essere un numero positivo
- Massimo 2 decimali
- Formato: `123.45` o `123`

### Validazione Descrizione (Solo per Spese Varie)
- Campo obbligatorio solo per categoria "Spese Varie"
- Massimo 500 caratteri
- Può contenere lettere, numeri, spazi, punteggiatura

### Validazione Contatti (Sempre Richiesta)
- Nome: 2-50 caratteri
- Solo lettere, spazi, apostrofi, trattini, &
- Deve contenere almeno una lettera

## Messaggi di Conferma

### Completamento Nota di Credito
```
🔔 Nota di Credito Registrata

📄 Categoria: IMU
👤 Persona: Mario Rossi
💰 Importo: €150,00
📝 Descrizione: Rimborsi vari

Registrato da: [Username]

Grazie da EnB
```

## Errori Comuni

### Errori di Validazione
- **Importo non valido:** "Errore nella validazione dell'importo"
- **Descrizione vuota (Spese Varie):** "Errore nella validazione della descrizione"
- **Nome contatto non valido:** "Il nome deve contenere almeno una lettera"

### Errori di Sistema
- **Categoria non trovata:** "Category not found"
- **Errore salvataggio:** "Errore durante il salvataggio della nota di credito"
- **Sincronizzazione fallita:** "Nota di credito salvata ma sincronizzazione con Google Sheets fallita"

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

### Categorie CreditNote nel Database
```sql
-- Categorie attualmente presenti nel database per creditNote (12 categorie):
-- Stipendi contributi (id=9), Cambusa (id=1), Materiale didattico (id=5)
-- Manutenzione (id=4), IMU (id=18), Utenza Tari (id=19), Utenza Acqua (id=20)
-- Spese Varie (id=8), Consorzio bonifica (id=22), Pronto Soccorso (id=6)
-- Pulizie (id=7), Webcolf (id=21)
```

## Differenze Architetturali

### 1. Metodo `requiresDescriptionStep()`
```typescript
private requiresDescriptionStep(categoryName: string): boolean {
  return categoryName === 'Spese Varie';
}
```

### 2. Flusso Sempre con Contatto
A differenza di outcome che ha una logica condizionale, creditNote richiede sempre il contatto dopo la categoria.

### 3. Messaggio di Notifica Personalizzato
```typescript
const notificationMessage = `🔔 ${boldMarkdownV2('Nota di Credito Registrata')}\n\n` +
  `📄 ${boldMarkdownV2('Categoria')}: ${boldMarkdownV2(escapeMarkdownV2(categoryName))}\n` +
  `👤 ${boldMarkdownV2('Persona')}: ${boldMarkdownV2(familyName)}\n` +
  `💰 ${boldMarkdownV2('Importo')}: ${formatCurrencyMarkdownV2(transactionPayload.amount as number)}\n` +
  (description ? `📝 ${boldMarkdownV2('Descrizione')}: ${boldMarkdownV2(description)}\n` : '') +
  `\nRegistrato da: ${boldMarkdownV2(recordedBy)}\n\n` +
  `Grazie da EnB`;
```

## Query per Verificare Categorie

```sql
SELECT c.id, c.name, c.label, ct.name as type
FROM categories c
JOIN category_type_assignments cta ON c.id = cta.category_id
JOIN category_types ct ON cta.category_type_id = ct.id
WHERE ct.name = 'creditNote'
ORDER BY c.sort_order;
```

## Manutenzione e Estensione

### Aggiungere Nuove Categorie
1. Inserire in tabella `categories`
2. Associare a `category_types` (id = 'creditNote')
3. Verificare se richiede descrizione speciale nel metodo `requiresDescriptionStep()`
4. Testare flusso completo

### Modificare Logica Descrizione
Aggiornare il metodo `requiresDescriptionStep()` in `creditnote-command.ts` e ridistribuire il bot.

## Troubleshooting

### Problemi Comuni
1. **Contatti non visibili:** Verificare che tutti i ruoli siano disponibili per creditNote (a differenza di altri comandi)
2. **Flusso interrotto:** Controllare validazione categorie e logica descrizione
3. **Descrizione richiesta inaspettatamente:** Solo "Spese Varie" dovrebbe richiederla
4. **Categoria non disponibile:** Verificare associazione a tipo 'creditNote'

### Debug Categorie
Per verificare categorie disponibili nel database:
```sql
SELECT c.id, c.name, c.label, ct.name as type
FROM categories c
JOIN category_type_assignments cta ON c.id = cta.category_id
JOIN category_types ct ON cta.category_type_id = ct.id
WHERE ct.name = 'creditNote'
ORDER BY c.sort_order;
```

### Log di Debug
Il sistema genera log dettagliati per ogni passo:
- Selezione categoria
- Filtraggio contatti (tutti i ruoli)
- Validazione importo/descrizione
- Salvataggio transazione
- Sincronizzazione Google Sheets

## Confronto tra Comandi

| Aspetto | Income | Outcome | CreditNote |
|---------|--------|---------|------------|
| **Contatto richiesto** | Sempre | Condizionale | Sempre |
| **Descrizione richiesta** | Solo Eventi/Altro | Sempre | Solo Spese Varie |
| **Ruoli contatti** | Famiglia/Multi | Fornitore/Speciali | Tutti i ruoli |
| **Categorie totali** | 6 | 12 | 12 |
| **Flusso caratteristico** | Categoria → Contatto → Importo → [Desc] → Periodo | Categoria → [Contatto] → Importo → Desc → Periodo | Categoria → Contatto → Importo → [Desc] → Periodo |

Questa configurazione rende creditNote il comando più flessibile ma anche più complesso dal punto di vista dell'interfaccia utente, poiché deve gestire tutti i tipi di contatto disponibili nel sistema.
