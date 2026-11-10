<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1aJH3zd204ek6Pxt6oH_tp_6HqLrt7HRj

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Struttura dei dati (schemaVersion 2)

Dalla versione con le sottocollezioni ogni elemento è un documento separato:

```
users/{uid}                 metadati (schemaVersion: 2) + vecchi array conservati come backup
users/{uid}/clients/{id}
users/{uid}/projects/{id}   (i pagamenti restano dentro il progetto)
users/{uid}/todos/{id}
users/{uid}/quotes/{id}     preventivi (legati a un progetto)
users/{uid}/settings/profile  i tuoi dati per l'intestazione dei preventivi
users/{uid}/documents/{id}  soggetti, trattamenti, note (testo Markdown)
users/{uid}/revisions/{id}  versioni precedenti dei documenti
users/{uid}/activity/{id}   registro delle azioni di Claude
mcpTokens/{sha256}          collegamenti del connettore Claude (solo l'hash del segreto)
```

## Connettore Claude (MCP)

`functions/` contiene un server MCP raggiungibile su `https://<sito>/mcp/<segreto>`.
Il segreto si genera in **Impostazioni → Claude** e si incolla su claude.ai come connettore personalizzato.
Claude può leggere e modificare clienti, progetti, attività, documenti e bozze di preventivo;
non può eliminare nulla, registrare pagamenti o cambiare lo stato dei preventivi.
Ogni modifica a un documento salva prima la versione precedente; ogni azione finisce nel registro.

Al primo accesso con la nuova versione i dati vengono copiati automaticamente dal vecchio formato.
La copia non cancella nulla e può essere ripetuta senza duplicati.

### Pubblicazione automatica

Ogni Merge su `main` pubblica tutto da solo: sito, connettore Claude e regole Firestore
(`.github/workflows/deploy.yml`, scheda *Actions* su GitHub). Non serve la shell.

### Pubblicare un aggiornamento che tocca i dati

1. Dall'app attuale: **Impostazioni → Esporta Backup**.
2. Pubblica regole, connettore Claude e app insieme (`firebase.json` esegue la build da solo):
   ```
   npx firebase-tools login
   npm --prefix functions install
   npx firebase-tools deploy --only firestore:rules,functions,hosting
   ```
   Il connettore Claude (Cloud Functions) richiede il piano Blaze. Senza, pubblica solo
   `firestore:rules,hosting`: tutto il resto funziona.
4. Ricarica l'app su tutti i dispositivi: le regole bloccano le scritture della versione vecchia.

### Sviluppo locale con gli emulatori

```
npm --prefix functions install
VITE_USE_EMULATOR=true npx vite build
npx firebase-tools emulators:start --only auth,firestore,functions,hosting --project progetta-800ca
APP_URL=http://127.0.0.1:5000 node tests/migration.e2e.cjs
APP_URL=http://127.0.0.1:5000 node tests/projects-quotes.e2e.cjs
node tests/claude-connector.e2e.mjs
```
Dopo i test cancella `dist/` (punta agli emulatori): `firebase deploy` la ricostruisce comunque.
