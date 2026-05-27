const msnodesql = require('msnodesqlv8');

// ทดสอบ Named Pipe โดยตรง
const pipes = [
  'Driver={ODBC Driver 17 for SQL Server};Server=np:\\\\.\\pipe\\MSSQL$SQLEXPRESS\\sql\\query;Database=TimetableMilitary;Trusted_Connection=yes;',
  'Driver={ODBC Driver 18 for SQL Server};Server=np:\\\\.\\pipe\\MSSQL$SQLEXPRESS\\sql\\query;Database=TimetableMilitary;Trusted_Connection=yes;',
  'Driver={SQL Server};Server=np:\\\\.\\pipe\\MSSQL$SQLEXPRESS\\sql\\query;Database=TimetableMilitary;Trusted_Connection=yes;',
  'Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=TimetableMilitary;Trusted_Connection=yes;',
];

let idx = 0;
function tryNext() {
  if (idx >= pipes.length) { console.log('ไม่มี connection ใดทำงานได้'); process.exit(1); }
  const cs = pipes[idx++];
  console.log(`\nลอง [${idx}]:`, cs.substring(0, 80));
  msnodesql.open(cs, (err, conn) => {
    if (err) { console.error('  ❌', err.message.split('\n')[0]); tryNext(); return; }
    conn.query('SELECT COUNT(*) AS cnt FROM Users', (err2, rows) => {
      if (err2) { console.error('  ❌ query:', err2.message); tryNext(); return; }
      console.log('  ✅ เชื่อมต่อได้! Users:', rows[0].cnt);
      console.log('\nConnection string ที่ใช้ได้:\n' + cs);
      process.exit(0);
    });
  });
}
tryNext();
