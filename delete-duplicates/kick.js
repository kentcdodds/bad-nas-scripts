const cp = require('child_process')
const fs = require('fs')

setInterval(() => {
  if (fs.existsSync('./working')) {
    return
  }
  const reportBeingGenerated = fs
    .readdirSync('/Volumes/Files/synoreport/Duplicates')
    .find(d => d.startsWith('tmp'))
  if (reportBeingGenerated) {
    return
  }
  console.log(String(cp.execSync('bash ./kick-off-report')))
}, 1000)
