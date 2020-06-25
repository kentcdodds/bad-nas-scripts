const path = require('path')
const fs = require('fs')
const execSync = require('child_process').execSync
const cliProgress = require('cli-progress')

const progressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic,
)

if (!process.argv[2] || !process.argv[3]) {
  throw new Error('you did not pass the source and destination paths')
}

const searchPath = path.join(process.cwd(), process.argv[2])
const destination = path.join(process.cwd(), process.argv[3])

console.log(`moving photos from "${searchPath}" to "${destination}"`)

console.log(`find "${searchPath}" -type f`)

const files = execSync(`find "${searchPath}" -type f`)
  .toString()
  .split('\n')
  .map(f => f.trim())
  .filter(Boolean)

progressBar.start(files.length)

files.forEach((file, index) => {
  progressBar.update(index)
  const destFile = getDestFile(file)
  execSync(`mkdir -p "${path.dirname(destFile)}"`)
  execSync(`mv "${file}" "${destFile}"`)
})

progressBar.stop()
console.log('done')

function getDestFile(file, count = 0) {
  const relativeFilepath = file.replace(searchPath, '')
  let destFile = path.join(destination, relativeFilepath)
  let {dir, name, ext} = path.parse(destFile)
  if (count > 0) {
    name = `${name}-${count}`
  }
  const parentDir = dir.split('/').slice(-1)

  // some of the folders are actual albums and others are just google-created albums
  if (/^\d{4}/.test(parentDir)) {
    dir = destination
  }
  destFile = path.format({dir, name, ext})

  if (fs.existsSync(destFile)) {
    destFile = getDestFile(file, count + 1)
  }
  return destFile
}
