# Documentazione Comando Income - EnB Bot

## Panoramica

Il comando `/entrata` del bot EnB permette di registrare nuove entrate finanziarie con un flusso interattivo che si adatta dinamicamente in base alla categoria selezionata.

## Categorie Disponibili

Il comando income supporta 6 categorie principali:

| Categoria | Label | Descrizione | Richiede Descrizione |
|-----------|-------|-------------|---------------------|
| **Quota Mensile** | Quota | Quota mensile per la scuola | ❌ No |
| **Quota Esame** | Esame | Quota per esami | ❌ No |
| **Quota Iscrizione** | Iscrizione | Quota di iscrizione | ❌ No |
| **Eventi** | Eventi | Spese per eventi | ✅ Sì |
| **Deposito Cauzionale** | D. cauzione | Deposito cauzionale | ❌ No |
| **Altro** | Altro | Altre spese/redditi | ✅ Sì |

## Differenze nel Flusso

### Flusso Standard (4 categorie)
```
Categoria → Nome persona → Importo → Periodo → Completamento
```

**Categorie coinvolte:**
- Quota Mensile
- Quota Esame
- Quota Iscrizione
- Deposito Cauzionale

### Flusso con Descrizione (2 categorie)
```
Categoria → Nome persona → Importo → Descrizione → Periodo → Completamento
```

**Categorie coinvolte:**
- Eventi
- Altro

**Differenza chiave:** Queste categorie richiedono obbligatoriamente il campo descrizione per fornire maggiori dettagli sull'entrata.

## Logica di Filtraggio Contatti

### Ruoli Disponibili
- 👨‍👩‍👧‍👦 **Famiglia** - Contatti familiari (genitori, studenti)
- 🏢 **Proprietario** - Proprietari/amministratori
- 👨‍🏫 **Maestro** - Insegnanti/maestri
- 🏪 **Fornitore** - Fornitori (usato principalmente per uscite)

### Assegnazione Ruoli per Categoria

#### Categorie con Contatti "Famiglia"
Mostrano **solo contatti con ruolo famiglia**:
- Quota Mensile
- Quota Esame
- Quota Iscrizione
- Deposito Cauzionale

#### Categorie con Contatti "Multi-ruolo"
Mostrano contatti con **più ruoli** (famiglia, proprietario, maestro):
- Eventi
- Altro

## Configurazione Ruoli

```typescript
const ROLE_REQUIREMENTS = {
  'entrata': {
    defaultRoles: [ROLES.Famiglia],
    categoryRoles: {
      [ROLES.Famiglia]: [
        'Quota Mensile',
        'Quota Esame',
        'Quota Iscrizione',
        'Deposito Cauzionale',
      ],
      [ROLES.Multi]: ['Eventi', 'Altro'] // famiglia, proprietario, maestro
    },
  },
}
```

## Comportamento dell'Interfaccia

### Messaggi di Filtraggio
L'interfaccia informa l'utente sui filtri attivi:

**Per categorie famiglia:**
```
🔍 Contatti filtrati per: 👨‍👩‍👧‍👦 Famiglia
📂 Categoria: Quota Mensile
🎯 Comando: Entrata
```

**Per categorie multi-ruolo:**
```
🔍 Contatti filtrati per: 👨‍👩‍👧‍👦 Famiglia, 🏢 Proprietario, 👨‍🏫 Maestro
📂 Categoria: Eventi
🎯 Comando: Entrata
```

## Creazione Nuovi Contatti

Quando si crea un nuovo contatto durante il flusso:

- **Categorie famiglia:** Il contatto riceve automaticamente il ruolo "famiglia"
- **Categorie multi-ruolo:** Il contatto riceve tutti e tre i ruoli (famiglia, proprietario, maestro)

Questo garantisce che i nuovi contatti siano immediatamente disponibili per le categorie appropriate.

## Flussi Dettagliati per Categoria

### 1. Quota Mensile (Flusso Standard)
```
1. Categoria: "Quota Mensile"
2. Contatti: Solo ruolo "famiglia"
3. Importo: Inserimento numerico
4. Periodo: Selezione mese/anno
5. Salvataggio: Transazione completata
```

### 2. Eventi (Flusso Speciale)
```
1. Categoria: "Eventi"
2. Contatti: Ruoli multipli (famiglia + proprietario + maestro)
3. Importo: Inserimento numerico
4. Descrizione: Campo obbligatorio per dettagli evento
5. Periodo: Selezione mese/anno
6. Salvataggio: Transazione completata
```

### 3. Altro (Flusso Speciale)
```
1. Categoria: "Altro"
2. Contatti: Ruoli multipli (famiglia + proprietario + maestro)
3. Importo: Inserimento numerico
4. Descrizione: Campo obbligatorio per dettagli generici
5. Periodo: Selezione mese/anno
6. Salvataggio: Transazione completata
```

## Validazione e Vincoli

### Validazione Importo
- Deve essere un numero positivo
- Massimo 2 decimali
- Formato: `123.45` o `123`

### Validazione Descrizione (solo per Eventi/Altro)
- Campo obbligatorio
- Massimo 500 caratteri
- Può contenere lettere, numeri, spazi, punteggiatura

### Validazione Contatti
- Nome: 2-50 caratteri
- Solo lettere, spazi, apostrofi, trattini, &
- Deve contenere almeno una lettera

## Messaggi di Conferma

### Completamento Transazione
```
🔔 Entrata Registrata

Ricevuti *€123,45* per Quota Mensile di Gennaio 2024 da Mario Rossi

Registrato da: [Username]

Grazie da EnB
```

## Errori Comuni

### Errori di Validazione
- **Importo non valido:** "Errore nella validazione dell'importo"
- **Descrizione vuota:** "Errore nella validazione della descrizione"
- **Nome contatto non valido:** "Il nome deve contenere almeno una lettera"

### Errori di Sistema
- **Categoria non trovata:** "Category not found"
- **Errore salvataggio:** "Errore durante il salvataggio dell'entrata"
- **Sincronizzazione fallita:** "Entrata salvata ma sincronizzazione con Google Sheets fallita"

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

### Tabella Categories
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  label VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER
);
```

### Tabella Contacts
```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  contact VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabella Roles
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Manutenzione e Estensione

### Aggiungere Nuove Categorie
1. Inserire in tabella `categories`
2. Associare a `category_types` (id = 'income')
3. Definire ruoli richiesti in `ROLE_REQUIREMENTS`
4. Testare flusso completo

### Modificare Logica Ruoli
Aggiornare la configurazione `ROLE_REQUIREMENTS` in `person-name-step.ts` e ridistribuire il bot.

## Troubleshooting

### Problemi Comuni
1. **Contatti non visibili:** Verificare assegnazione ruoli corretta
2. **Flusso interrotto:** Controllare validazione categorie
3. **Sincronizzazione fallita:** Verificare configurazione Google Sheets

### Log di Debug
Il sistema genera log dettagliati per ogni passo:
- Selezione categoria
- Filtraggio contatti
- Validazione importo/descrizione
- Salvataggio transazione
- Sincronizzazione Google Sheets
