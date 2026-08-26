// R1-F.2 evidence fixture: write own PID to argv[2], then sleep forever
const fs = require('fs');
try { fs.writeFileSync(process.argv[2], String(process.pid)); } catch (e) {}
setInterval(() => {}, 60000000);
