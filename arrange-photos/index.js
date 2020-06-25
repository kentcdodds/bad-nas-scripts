global.require = require
const path = require('path')
const fs = require('fs')
const util = require('util')
const execSync = require('child_process').execSync
const exifr = require('exifr/dist/full.umd')

const readFile = util.promisify(fs.readFile)
const stat = util.promisify(fs.stat)

var twoDigits = n => (n.toString().length < 2 ? `0${n}` : n)

if (!process.argv[2]) {
  throw new Error('you did not pass the source and destination paths')
}

const searchPath = path.join(process.cwd(), process.argv[2])

console.log(`moving photos in "${searchPath}"`)

console.log(`Reading directory ${searchPath}`)

const files = fs.readdirSync(searchPath)

;(async () => {
  let unknownCount = 0
  const dirCommands = new Set()
  const moveCommands = []
  const removeCommands = []
  for (const file of files) {
    const fullFilePath = path.join(searchPath, file)
    const stats = await stat(fullFilePath)
    if (stats.isDirectory()) continue
    const {base, ext} = path.parse(file)
    let dir = path.join(searchPath, 'Unknown date')
    if (['.jpg', '.jpeg', '.heic'].includes(ext.toLowerCase())) {
      try {
        const exifData = await exifr.parse(fullFilePath)
        if (exifData && exifData.DateTimeOriginal) {
          const mm = twoDigits(exifData.DateTimeOriginal.getMonth() + 1)
          const yyyy = exifData.DateTimeOriginal.getFullYear()
          dir = path.join(searchPath, `${yyyy}-${mm}`)
        }
      } catch (error) {
        if (
          // base.startsWith('MVIMG') &&
          error.message === 'Unknown file format'
        ) {
          removeCommands.push(`rm -f "${fullFilePath}"`)
          continue
        }
        console.error(fullFilePath, error)
      }
    }

    if (dir.includes('Unknown')) {
      unknownCount++
    }

    const dirCommand = `mkdir -p "${dir}"`
    const moveCommand = `mv "${fullFilePath}" "${path.join(dir, base)}"`
    // console.log(dirCommand)
    dirCommands.add(dirCommand)
    moveCommands.push(moveCommand)
  }

  // console.log(Array.from(dirCommands).join('\n'))

  // console.log(moveCommands.join('\n'))
  console.log('Remove commands count: ', removeCommands.length)
  console.log('Unknown count: ', unknownCount)
  fs.writeFileSync(
    './commands',
    [...removeCommands, '', ...dirCommands, '', ...moveCommands].join('\n'),
  )

  // console.log(files)
})()

/*
      try {
        const fileContents = await readFile(fullFilePath)
        const exifData = getExif(fileContents)
        if (!exifData.Exif) {
          const {thumbnail, ...rest} = exifData
          console.log(fullFilePath, 'No Exif data...', rest)
        } else {
          const dateString =
            exifData.Exif[DateTimeOriginal] || exifData.Exif[DateTimeDigitized]
          if (dateString) {
            const ymd = dateString.split(' ')[0]
            const [year, month] = ymd.split(':')
            dir = path.join(searchPath, `${year}-${month}`)
          }
        }
      } catch (error) {
        if (base.startsWith('MVIMG') && error instanceof RangeError) {
          removeCommands.push(`rm -f ${fullFilePath}`)
          continue
        } else if (
          error instanceof RangeError &&
          error.message.includes('non-JPEG data')
        ) {
          dir = path.join(searchPath, 'non-jpg')
          moveCommands.push(`mv "${fullFilePath}" "${path.join(dir, base)}"`)
          continue
        }
        console.error(fullFilePath, error)
      }
*/
