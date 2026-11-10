// Connettore MCP di Progetta per claude.ai.
// URL: https://<sito>/mcp/<segreto>  (il segreto si genera in Impostazioni → Claude)
import { createHash } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools } from './tools.js';
import { buildCalendar } from './calendar.js';

initializeApp();
const db = getFirestore();

const INSTRUCTIONS = `Progetta è il gestionale di un filmmaker indipendente in regime forfettario: clienti, progetti, attività, pagamenti, preventivi, documenti di testo (soggetti, trattamenti, sceneggiature, note in Markdown) e storyboard (inquadrature numerate per scena: 1A, 1B, 2A…).
- Leggi prima di scrivere: usa read_document e passa expectedRevision alle modifiche.
- Per ritocchi usa edit_document (sostituzioni puntuali), per riscritture complete update_document.
- I preventivi creati sono bozze: l'utente li invia e li accetta dall'app. Niente IVA (forfettario).
- Per una storyboard da un testo: create_storyboard, poi add_shots con le inquadrature in ordine. Non puoi disegnare le immagini dei fotogrammi.
- Lo stato "opportunità" indica trattative incerte: non vanno sommate agli incassi attesi.
- Non puoi eliminare dati né registrare pagamenti.`;

const sha256 = text => createHash('sha256').update(text).digest('hex');

// Calendario per Google Calendar ("Aggiungi da URL"): https://<sito>/cal/<segreto>.ics
// Il segreto si genera in Impostazioni → Calendario ed è separato da quello di Claude.
const serveCalendar = async (req, res) => {
  const token = (req.path.split('/').filter(Boolean).pop() || '').replace(/\.ics$/, '');
  if (token.length < 32) { res.status(404).send('Calendario non trovato.'); return; }
  const link = await db.collection('calendarTokens').doc(sha256(token)).get();
  if (!link.exists) { res.status(404).send('Calendario non trovato o revocato.'); return; }
  try {
    const appUrl = `https://${req.get('x-forwarded-host') || req.get('host') || ''}`;
    const ics = await buildCalendar(db, link.data().uid, appUrl);
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'private, max-age=900');
    res.send(ics);
  } catch (e) {
    console.error('Errore calendario', e);
    res.status(500).send('Errore interno.');
  }
};

const jsonRpcError = (res, status, message) =>
  res.status(status).json({ jsonrpc: '2.0', error: { code: -32000, message }, id: null });

export const mcp = onRequest(
  { region: 'us-central1', maxInstances: 2, timeoutSeconds: 60, memory: '256MiB' },
  async (req, res) => {
    // Calendario delle scadenze (sola lettura), servito dalla stessa funzione: /cal/<segreto>.ics
    if (req.path.includes('/cal/')) return serveCalendar(req, res);

    // Il segreto è l'ultimo segmento del percorso: /mcp/<segreto>
    const token = req.path.split('/').filter(Boolean).pop() || '';
    if (token.length < 32) return jsonRpcError(res, 401, 'Collegamento non valido.');

    const link = await db.collection('mcpTokens').doc(sha256(token)).get();
    if (!link.exists) return jsonRpcError(res, 401, 'Collegamento non valido o revocato.');
    const uid = link.data().uid;

    // Server senza sessione: ogni richiesta POST è indipendente.
    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      return jsonRpcError(res, 405, 'Metodo non supportato.');
    }

    const server = new McpServer({ name: 'progetta', version: '1.0.0' }, { instructions: INSTRUCTIONS });
    registerTools(server, db, uid);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transport.close(); server.close(); });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('Errore MCP', e);
      if (!res.headersSent) jsonRpcError(res, 500, 'Errore interno.');
    }
  },
);

