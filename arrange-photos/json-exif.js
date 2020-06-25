const path = require('path')
const cp = require('child_process')
const {stat, writeFile} = require('fs').promises
const fs = require('fs')
const util = require('util')
const glob = require('glob')
const exiftool = require('node-exiftool')
const {CoordinateConverter} = require('./coordinate-converter')
const exec = util.promisify(cp.exec)

const ep = new exiftool.ExiftoolProcess(
  path.join(__dirname, 'exiftools/exiftool'),
)

const opening = ep.open()
const searchPath = '/volume1/photo'
const destPath = '/volume1/photo'

function getGeoMetaData(geoMetadata, createDate) {
  try {
    const {latitude, longitude, altitude} = geoMetadata
    if (latitude === 0 || longitude === 0) {
      return null
    }
    const [lat, long] = CoordinateConverter.fromDecimal([
      latitude,
      longitude,
    ]).toDegreeMinutesSeconds()
    return {
      'GPS Latitude Ref': lat.includes('N') ? 'North' : 'South',
      'GPS Longitude Ref': long.includes('W') ? 'West' : 'East',
      'GPS Altitude Ref': 'Above Sea Level',
      'GPS Date/Time': createDate,
      'GPS Altitude': `${altitude} m Above Sea Level`,
      'GPS Latitude': lat,
      'GPS Longitude': long,
      'GPS Position': `${lat}, ${long}`,
    }
  } catch (error) {
    console.log('gps', geoMetadata, createDate)
    throw error
    // return null
  }
}

function getCreateDate(formattedDate) {
  const date = new Date(formattedDate)
  const year = date.getFullYear()
  const month = twoDigits(date.getMonth() + 1)
  const day = twoDigits(date.getDate())
  const hour = twoDigits(date.getHours())
  const minute = twoDigits(date.getMinutes())
  const second = twoDigits(date.getSeconds())
  let {
    groups: {timezone},
  } = date.toString().match(/GMT(?<timezone>.*?) /i)
  return `${year}:${month}:${day} ${hour}:${minute}:${second}${timezone}`
}

function getTimeMetaData(createDate) {
  if (createDate) {
    return {
      'Date/Time Original': createDate,
      'Create Date': createDate,
    }
  } else {
    return null
  }
}

function getMetaData(filename) {
  try {
    let data
    try {
      data = require(`./json/${filename}.json`)
    } catch (error) {
      // no json for this file. The sadness...
      return
    }
    const {description, geoData, geoDataExif, photoTakenTime} = data
    const createDate = getCreateDate(photoTakenTime.formatted)
    const geoMetaData =
      getGeoMetaData(geoData, createDate) ||
      getGeoMetaData(geoDataExif, createDate)
    return {
      ...(description ? {ImageDescription: description} : null),
      ...getTimeMetaData(createDate),
      ...geoMetaData,
    }
  } catch (error) {
    console.log('getMetaData', filename)
    throw error
    // return null
  }
}

const twoDigits = n => (n.toString().length < 2 ? `0${n}` : n)

async function main() {
  await opening
  const files = await util.promisify(glob)('**/*.*', {
    cwd: searchPath,
    nodir: true,
    ignore: '**/@eaDir/**',
  })

  const commands = new Set()

  console.log(`processing ${files.length} files`)

  for (const file of files) {
    const fullFilePath = path.isAbsolute(file)
      ? file
      : path.join(searchPath, file)
    const {base: filename, ext} = path.parse(fullFilePath)
    const metadata = getMetaData(filename)
    if (!metadata) {
      continue
    }
    try {
      await ep.writeMetadata(fullFilePath, metadata, ['overwrite_original'])
      const createDate = metadata['Create Date']
      const [year, month] = createDate.split(' ')[0].split(':')
      const dir = `${year.trim()}-${twoDigits(month).trim()}`
      const newDest = path.join(destPath, dir, filename)
      const newDirPath = path.join(destPath, dir)
      if (newDest === fullFilePath) {
        continue
      }

      const newCommands = [
        ...commands,
        fs.existsSync(newDirPath) ? null : `mkdir -p "${newDirPath}"`,
        fs.existsSync(newDest)
          ? `# ${newDest}\nrm "${fullFilePath}"\n`
          : `mv "${fullFilePath}" "${newDest}"`,
      ].filter(Boolean)
      newCommands.forEach(commands.add, commands)
    } catch (error) {
      console.log(fullFilePath, metadata)
      throw error
    }
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
    'total removed files: ',
    commandsArr.filter(c => c.startsWith('rm')).length,
  )
  console.log(
    'total unknown dates: ',
    commandsArr.filter(
      c => c.startsWith('mv') && c.split(' ')[2].includes('Unknown date'),
    ).length,
  )
}

main()
