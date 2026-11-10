// Calendario delle scadenze in formato iCalendar (RFC 5545), per l'abbonamento da Google Calendar.
// Contiene le attività con una data di scadenza, non completate, di progetti non annullati.

// Testo: escape di \ ; , e a capo
const esc = text => String(text ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

// Le righe più lunghe di 75 byte vanno spezzate e continuate con uno spazio iniziale
const fold = line => {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = '';
  for (const ch of line) {
    const limit = parts.length === 0 ? 75 : 74; // le righe di continuazione iniziano con uno spazio
    if (Buffer.byteLength(current + ch, 'utf8') > limit) { parts.push(current); current = ''; }
    current += ch;
  }
  parts.push(current);
  return parts.join('\r\n ');
};

const ymd = iso => iso.slice(0, 10).replace(/-/g, '');
const nextDay = iso => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export async function buildCalendar(db, uid, appUrl) {
  const user = db.collection('users').doc(uid);
  const [todos, projects, clients] = await Promise.all(
    ['todos', 'projects', 'clients'].map(async name => (await user.collection(name).get()).docs.map(d => ({ id: d.id, ...d.data() }))));
  const projectById = new Map(projects.map(p => [p.id, p]));
  const clientById = new Map(clients.map(c => [c.id, c]));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Progetta//Scadenze//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Progetta · scadenze',
    'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  const now = stamp();

  todos
    .filter(t => !t.completed && typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(t.dueDate))
    .forEach(t => {
      const project = projectById.get(t.projectId);
      if (project?.workStatus === 'annullato') return;
      const client = project ? clientById.get(project.clientId) : null;
      const context = [client?.name, project?.name].filter(Boolean).join(' / ');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${t.id}@progetta`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${ymd(t.dueDate)}`,
        `DTEND;VALUE=DATE:${ymd(nextDay(t.dueDate))}`,
        `SUMMARY:${esc(t.task)}`,
        `DESCRIPTION:${esc([context, appUrl].filter(Boolean).join('\n'))}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      );
    });

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
