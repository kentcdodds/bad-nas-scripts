const path = require('path')
const cp = require('child_process')
const {stat, writeFile} = require('fs').promises
const fs = require('fs')
const util = require('util')
const glob = require('glob')
const exiftool = require('node-exiftool')
const exec = util.promisify(cp.exec)

const ep = new exiftool.ExiftoolProcess(
  path.join(__dirname, 'exiftools/exiftool'),
)

const DATE_EXTRACTOR = /(?<year>(19[0-9][0-9]|20[0-1][0-9]|2020)).?(?<month>(0[1-9]|1[0-2])).?(?<day>([0-2][0-9]|3[0-1]))/
const TIME_EXTRACTOR = /(?<hour>([0-1][0-9]|2[0-4])).?(?<minute>[0-5][0-9]).?(?<second>[0-5][0-9])/

const twoDigits = n => (n.toString().length < 2 ? `0${n}` : n)

const opening = ep.open()

if (!process.argv[2]) {
  throw new Error('you did not pass the source path')
}

const searchPath = path.isAbsolute(process.argv[2])
  ? process.argv[2].replace('/Volumes', '/volume1')
  : path.join(process.cwd(), process.argv[2])
const destPath = '/volume1/photo'

if (true) {
  main()
} else {
  ;(async () => {
    await opening
    const cmds = await processFile(
      '/volume1/photo/Unknown date/2018-06-02_10-44-20_472.mp4',
    )
    console.log(cmds)
    await ep.close()
  })()
}

const errors = {}
async function main() {
  await opening
  const files = await util.promisify(glob)('**/*', {
    cwd: searchPath,
    nodir: true,
    ignore: '**/@eaDir/**',
  })

  console.log(`processing ${files.length} files in "${searchPath}"`)
  const commands = new Set()
  for (const file of files) {
    try {
      const fullFilePath = path.isAbsolute(file)
        ? file
        : path.join(searchPath, file)
      // const stats = await stat(fullFilePath)
      // if (stats.isDirectory()) continue
      const newCommands = await processFile(fullFilePath)
      newCommands.forEach(commands.add, commands)
    } catch (error) {
      console.error(error)
      // ignore individual errors. Deal with those later
    }
  }
  await writeFile('./commands', [...commands].sort().join('\n'))
  await ep.close()
  const commandsArr = Array.from(commands)
  console.log('errors:')
  console.dir(errors)
  console.log(Object.keys(errors))
  console.log(
    'max new dirs: ',
    commandsArr.filter(c => c.startsWith('mkdir')).length,
  )
  console.log(
    'total moved files: ',
    commandsArr.filter(c => c.startsWith('mv')).length,
  )
  console.log(
    'total exif rewrites: ',
    commandsArr.filter(c => c.startsWith('# exiftool')).length,
  )
  console.log(
    'total unknown dates: ',
    commandsArr.filter(c => c.startsWith('mv') && c.includes('Unknown date'))
      .length,
  )
}

async function processFile(filepath) {
  const {base: filename, ext} = path.parse(filepath)
  let dir = 'Unknown date'
  const commands = []
  try {
    const metadata = await ep.readMetadata(filepath)
    const data = metadata.data[0]
    const fullDateString = data.DateTimeOriginal || data.CreateDate
    const [year, month] = fullDateString.split(' ')[0].split(':')
    const folder = `${year.trim()}-${twoDigits(month).trim()}`
    if (
      folder.includes('undefined') ||
      folder.includes('0000') ||
      folder.length !== 'YYYY-MM'.length
    ) {
      throw new Error('invalid year or month')
    } else {
      dir = `${year.trim()}-${twoDigits(month).trim()}`
    }
  } catch (error) {
    errors[error.message] = errors[error.message] || []
    errors[error.message].push(filepath)
    const match = filename.match(DATE_EXTRACTOR)
    let createDate
    if (match) {
      const datelessFilename = filename.replace(DATE_EXTRACTOR, '')
      const {
        groups: {year, month, day},
      } = match
      const {
        groups: {hour = '00', minute = '00', second = '00'},
      } = datelessFilename.match(TIME_EXTRACTOR) || {groups: {}}
      createDate = `${year}:${month}:${day} ${hour}:${minute}:${second}`
    } else {
      const {birthtimeMs, mtimeMs, atimeMs, ctimeMs} = await stat(filepath)
      const refTime = Math.min(birthtimeMs, mtimeMs, atimeMs, ctimeMs)
      if (refTime < new Date('2019-12-10').getTime()) {
        const refDate = new Date(refTime)
        const year = refDate.getFullYear()
        const month = twoDigits(refDate.getMonth() + 1)
        const day = twoDigits(refDate.getDate())
        const hour = twoDigits(refDate.getHours())
        const minute = twoDigits(refDate.getMinutes())
        const second = twoDigits(refDate.getSeconds())
        createDate = `${year}:${month}:${day} ${hour}:${minute}:${second}`
      }
    }
    if (createDate) {
      const [year, month] = createDate.split(' ')[0].split(':')
      const folder = `${year.trim()}-${month.trim()}`
      if (folder.includes('undefined') || folder.length !== 'YYYY-MM'.length) {
        errors['invalid year or month'] = errors['invalid year or month'] || []
        errors['invalid year or month'].push(filepath)
      } else {
        dir = folder
        try {
          await ep.writeMetadata(
            filepath,
            {DateTimeOriginal: createDate, CreateDate: createDate},
            ['overwrite_original'],
          )
          commands.push(
            `# exiftool write "${filepath}" DateTimeOriginal: "${createDate}"`,
          )
        } catch (error) {
          console.log(error)
          // we tried...
        }
      }
    }
  }
  if (dir === '0000-00') dir = 'Unknown date'
  const newDest = path.join(destPath, dir, filename)
  const newDirPath = path.join(destPath, dir)
  return [
    ...commands,
    fs.existsSync(newDirPath) ? null : `mkdir -p "${newDirPath}"`,
    newDest === filepath ? null : `mv "${filepath}" "${newDest}"`,
  ].filter(Boolean)
}
