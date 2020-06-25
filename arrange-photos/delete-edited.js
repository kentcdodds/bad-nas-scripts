const path = require('path')
const cp = require('child_process')
const {stat, writeFile} = require('fs').promises
const fs = require('fs')
const util = require('util')
const exiftool = require('node-exiftool')
const glob = require('glob')

const searchPath = '/volume1/photo'
const destPath = '/volume1/photo'

const ep = new exiftool.ExiftoolProcess(
  path.join(__dirname, 'exiftools/exiftool'),
)

const opening = ep.open()

async function main() {
  await opening
  const files = await util.promisify(glob)('**/*Conflict.*', {
    cwd: searchPath,
    nodir: true,
    ignore: '**/@eaDir/**',
  })

  const commands = []

  console.log(`processing ${files.length} files`)

  for (const file of files) {
    const fullFilePath = path.isAbsolute(file)
      ? file
      : path.join(searchPath, file)
    const {base: filename, ext} = path.parse(fullFilePath)
    const nonEditedPath = fullFilePath.replace(/_DiskStation.*?Conflict/, '')
    if (fs.existsSync(nonEditedPath)) {
      const {DateTimeOriginal: oneDate} = (
        await ep.readMetadata(fullFilePath)
      ).data[0]
      const {DateTimeOriginal: twoDate} = (
        await ep.readMetadata(nonEditedPath)
      ).data[0]
      if (oneDate && twoDate && oneDate === twoDate) {
        commands.push(`rm "${fullFilePath}"`)
      }
    } else {
      commands.push(`mv "${fullFilePath}" "${nonEditedPath}"`)
    }
  }

  await writeFile('./edited-commands', [...commands].join('\n'))
  await ep.close()
  console.log('total files: ', commands.length)
}

main()
