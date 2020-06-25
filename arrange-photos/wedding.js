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

const opening = ep.open()

const searchPath = '/volume1/photo/2011-07'
const destPath = '/volume1/photo'

const twoDigits = n => (n.toString().length < 2 ? `0${n}` : n)

async function main() {
  await opening
  const files = await util.promisify(glob)('**/Wedding*', {
    cwd: searchPath,
    nodir: true,
    ignore: '**/@eaDir/**',
  })
  console.log(files)
  const commands = new Set()
  let count = 0
  for (const file of files) {
    const fullFilePath = path.isAbsolute(file)
      ? file
      : path.join(searchPath, file)
    const {base: filename, ext} = path.parse(fullFilePath)
    const {DateTimeOriginal} = (
      await ep.readMetadata(fullFilePath)
    ).data[0]
    if (!DateTimeOriginal.includes('2008')) continue
    const createDate = getStamp()
    console.log(createDate)
    await ep.writeMetadata(
      fullFilePath,
      {DateTimeOriginal: createDate, CreateDate: createDate},
      ['overwrite_original'],
    )
    const [year, month] = createDate.split(' ')[0].split(':')
    const dir = `${year.trim()}-${twoDigits(month).trim()}`
    const newDest = path.join(destPath, dir, filename)
    const newDirPath = path.join(destPath, dir)
    const newCommands = [
      ...commands,
      fs.existsSync(newDirPath) ? null : `mkdir -p "${newDirPath}"`,
      newDest === fullFilePath ? null : `mv "${fullFilePath}" "${newDest}"`,
    ].filter(Boolean)
    newCommands.forEach(commands.add, commands)
  }

  await writeFile('./commands', [...commands].sort().join('\n'))
  await ep.close()
  const commandsArr = Array.from(commands)
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

const initialDate = new Date()
initialDate.setMonth(6)
initialDate.setFullYear(2011)
initialDate.setDate(8)
initialDate.setHours(9)
initialDate.setMinutes(0)
initialDate.setSeconds(0)
const refTime = initialDate.getTime()
let count = 1
function getStamp() {
  count += 1
  const refDate = new Date(refTime + count * 1000)
  const year = refDate.getFullYear()
  const month = twoDigits(refDate.getMonth() + 1)
  const day = twoDigits(refDate.getDate())
  const hour = twoDigits(refDate.getHours())
  const minute = twoDigits(refDate.getMinutes())
  const second = twoDigits(refDate.getSeconds())
  return `${year}:${month}:${day} ${hour}:${minute}:${second}`
}

main()

