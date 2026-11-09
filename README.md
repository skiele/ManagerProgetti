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
```

Al primo accesso con la nuova versione i dati vengono copiati automaticamente dal vecchio formato.
La copia non cancella nulla e può essere ripetuta senza duplicati.

### Pubblicare un aggiornamento che tocca i dati

1. Dall'app attuale: **Impostazioni → Esporta Backup**.
2. Pubblica le regole di `firestore.rules` (console Firebase → Firestore Database → Regole, oppure `firebase deploy --only firestore:rules`).
3. Pubblica subito dopo la nuova versione dell'app.
4. Ricarica l'app su tutti i dispositivi: le regole bloccano le scritture della versione vecchia.

### Sviluppo locale con gli emulatori

```
npx firebase-tools emulators:start --only auth,firestore --project progetta-800ca
VITE_USE_EMULATOR=true npm run dev
```
