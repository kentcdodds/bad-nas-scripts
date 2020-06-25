const os = require('os')
const path = require('path')
const fs = require('fs')
const exec = require('child_process').exec

const pLimit = require('p-limit')
const cliProgress = require('cli-progress')

const progressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic,
)

const limit = pLimit(30)

if (!process.argv[2]) {
  throw new Error('you did not pass the source path')
}

const run = process.argv[3] !== 'dry'

const searchPath = path.join(process.cwd(), process.argv[2])

console.log(`Reading hashes file...`)

const tmpDir = path.join(__dirname, 'duplicate-photos')
const hashesJsonFile = path.join(tmpDir, 'hashes.json')

const filesAndHashes = require(hashesJsonFile)

console.log('hashes read')

console.log('creating groups')
const filesByHash = {}
for (const {filepath, hash} of filesAndHashes) {
  filesByHash[hash] = filesByHash[hash] || []
  filesByHash[hash].push(filepath)
}
console.log('filtering out one-element groups')
const groups = {}
for (const hash in filesByHash) {
  if (filesByHash[hash].length > 1) {
    groups[hash] = filesByHash[hash]
  }
}

const totalGroups = Object.keys(groups).length
const totalFiles = Object.values(groups).reduce(
  (count, files) => files.length + count,
  0,
)

console.log(
  `Found: ${totalGroups} duplicate matches. A total of ${totalFiles} files`,
)

if (!Object.keys(groups).length) {
  console.log('no duplicates found')
}

let finished = 0
const promises = []

for (const hash in groups) {
  const files = groups[hash]
  let keepFile = files[0]
  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    keepFile = getKeepFile(keepFile, file)
  }
  const removeFiles = files.filter(f => f !== keepFile)
  removeFiles.forEach(file => {
    const destination = path.join(tmpDir, file.replace(searchPath, ''))
    promises.push(
      limit(() => {
        return new Promise(resolve => {
          exec(
            `mkdir -p "${path.dirname(
              destination,
            )}" && mv "${file}" "${destination}"`,
            error => {
              finished += 1
              resolve({error})
            },
          )
        })
      }),
    )
  })
}

console.log(`We have ${promises.length} total duplicates. Moving them now.`)
progressBar.start(promises.length)
const i1 = setInterval(() => {
  progressBar.update(finished)
}, 1000)

Promise.all(promises).then(results => {
  clearInterval(i1)
  progressBar.stop()
  console.log('all done')
  const errors = results.filter(({error}) => error)
  if (errors.length) {
    console.log('There were errors')
    console.log(errors)
  }
})

function getKeepFile(file1, file2) {
  if (
    file2.split('/').length > file1.split('/').length || // file 2 is deeper
    file2.length < file1.length // file 2 is shortert
  ) {
    return file2
  }
  return file1
}
