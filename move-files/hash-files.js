const os = require('os')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const execSync = require('child_process').execSync
const pLimit = require('p-limit')
const cliProgress = require('cli-progress')

const progressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic,
)

// start the progress bar with a total value of 200 and start value of 0

const limit = pLimit(16)

if (!process.argv[2]) {
  throw new Error('you did not pass the source path')
}

const run = process.argv[3] !== 'dry'

const searchPath = path.join(process.cwd(), process.argv[2])

console.log(`finding duplicates. Preferring files with the shorter filename`)

const tmpDir = path.join(__dirname, 'duplicate-photos')
console.log(`Creating a temporary directory at "${tmpDir}"`)
execSync(`mkdir -p "${tmpDir}"`)

console.log(`find "${searchPath}" -type f`)

const hashesJsonFile = path.join(tmpDir, 'hashes.json')

let filesAndHashes = []

try {
  filesAndHashes = require(hashesJsonFile)
} catch (error) {
  // ignore
}

const cachedFilenames = filesAndHashes.map(({filepath}) => filepath)

const files = execSync(`find "${searchPath}" -type f`)
  .toString()
  .split('\n')
  .map(f => f.trim())
  .filter(Boolean)

progressBar.start(files.length, cachedFilenames.length)

const allHashPromises = files
  .filter(file => !cachedFilenames.includes(file))
  .map(filepath =>
    limit(async () => {
      const hash = await createHashForFile(filepath)
      try {
        filesAndHashes.push({filepath, hash})
      } catch (error) {
        filesAndHashes.push({filepath, error})
      }
    }),
  )

const save = () =>
  fs.writeFileSync(hashesJsonFile, JSON.stringify(filesAndHashes))

const i1 = setInterval(() => {
  progressBar.update(Object.keys(filesAndHashes).length)
  save()
}, 1000)

Promise.all(allHashPromises).then(() => {
  clearInterval(i1)
  progressBar.stop()
  save()
  console.log('all done')
  const errors = filesAndHashes.filter(({error}) => error)
  if (errors.length) {
    console.log('There were errors')
    console.log(errors)
  }
})

function createHashForFile(filepath) {
  const hash = crypto.createHash('md5')

  return new Promise(resolve => {
    const stream = fs
      .createReadStream(filepath, {autoClose: true})
      .on('data', data => hash.update(data))
      .on('end', () => {
        resolve(String(hash.digest('hex')))
      })
  })
}

function getKeepFile(file1, file2) {
  if (
    file2.split('/').length > file1.split('/').length || // file 2 is deeper
    file2.length < file1.length // file 2 is shortert
  ) {
    return file2
  }
  return file1
}
