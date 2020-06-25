const path = require('path')
const csv = require('csv-parser')
const fs = require('fs')
const groupBy = require('lodash.groupby')
const unzipper = require('unzipper')
const cp = require('child_process')
const util = require('util')
const chokidar = require('chokidar')
const throttle = require('lodash.throttle')

const spawn = util.promisify(cp.spawn)
const log = (...args) => console.log(new Date(), ...args)

const searches = [
  ({File}) => File.startsWith('/volume1/photo/'),
  ({File}) => File.startsWith('/volume1/plex-library/'),
  ({File}) => File.startsWith('/volume1/music/'),
  ({File}) => File.startsWith('/volume1/homes/'),
  ({File}) => File.startsWith('/volume1/Files/Backup/'),
]

const reportsDir = '/volume1/Files/synoreport/Duplicates'

let currentReport = getLatestReportZip()
extractArchive(currentReport)

setInterval(() => {
  const nextReport = getLatestReportZip()
  if (nextReport !== currentReport) {
    currentReport = nextReport
    extractArchive(currentReport)
  }
}, 1000)

function getLatestReportZip() {
  return path.join(getLatestReportDir(), 'csv/duplicate_file.csv.zip')
}

function getLatestReportDir() {
  const dirs = fs
    .readdirSync('/volume1/Files/synoreport/Duplicates')
    .filter(d => !d.startsWith('tmp'))
  return path.join(reportsDir, dirs[dirs.length - 1])
}

// chokidar
//   .watch(path.join(reportsDir, '**', '*.zip'))
//   .on('add', throttle(handleReportAdd, 1000))

// function handleReportAdd(pathToZip) {
//   const latestReportDir = getLatestReportDir()
//   if (pathToZip.includes(latestReportDir)) {
//     extractArchive(pathToZip)
//   } else {
//     log(
//       `ignoring ${pathToZip} because it's not the latest report of ${latestReportDir}`,
//     )
//   }
// }

// extractArchive(path.join(getLatestReportDir(), 'csv/duplicate_file.csv.zip'))

const workingFile = './working'

async function extractArchive(zip) {
  log(`Reading zip: ${zip}`)
  cp.execSync('touch ./working')
  await new Promise((resolve, reject) =>
    fs
      .createReadStream(zip)
      .pipe(unzipper.Extract({path: path.dirname(zip)}))
      .on('close', resolve)
      .on('error', reject),
  )
  const csvFilePath = path.join(path.dirname(zip), 'duplicate_file.csv')
  await generateScript(csvFilePath)
  console.log('all done')
}

function generateScript(csvFilePath) {
  return new Promise((resolve, reject) => {
    let results = []
    log(`Reading CSV in ${csvFilePath}`)
    fs.createReadStream(csvFilePath, {encoding: 'utf16le'})
      .pipe(csv({separator: '\t'}))
      .on('data', originalData => {
        const data = {}
        Object.keys(originalData).forEach(key => {
          if (key.includes('Group')) {
            data.Group = originalData[key]
          } else {
            data[key.trim()] = originalData[key]
          }
        })
        if (data.File.includes('kids-mp3')) {
          return
        }
        // data.File = data.File.replace('/volume1', '/Volumes')
        results.push(data)
      })
      .on('end', () => {
        const groups = groupBy(results, 'Group')
        const groupCount = Object.keys(groups).length
        const filesPerGroup = (results.length / groupCount).toFixed(2)
        log(
          `There are ${
            results.length
          } total files and ${groupCount} groups, giving about ${filesPerGroup} files per group... Creating script to delete ${results.length -
            groupCount} files`,
        )
        // if (results.length < 500) {
        //   throw new Error('I think we are almost done finally')
        // }
        const commands = Object.values(groups)
          .map(group => {
            if (group.length < 2) {
              return ''
            }
            let keeper
            for (const search of searches) {
              const result = group.find(search)
              if (result) {
                keeper = result
                break
              }
            }
            keeper = keeper || group[0]
            const deleted = group.filter(g => g !== keeper)
            return [
              `# ${keeper.Group}: "${keeper.File.replace(/\$/g, '\\$')}"`,
              ...deleted.map(d => `rm -f "${d.File.replace(/\$/g, '\\$')}"`),
            ].join('\n')
          })
          .join('\n\n')

        fs.writeFileSync('./delete-script', `${commands}\n\necho done!\n`)
        if (filesPerGroup > 1000) {
          throw new Error('Something is wrong...')
        }
        log('running script')
        const stdout = cp.execSync('bash ./delete-script')
        log(String(stdout))
        cp.execSync('rm -f ./working')
        // spawn('bash ./delete-script', {stdio: 'inherit', shell: true})
        //   .then(resolve)
        //   .catch(reject)
      })
      .on('error', reject)
  })
}
