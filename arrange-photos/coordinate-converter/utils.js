'use strict'

require('core-js/modules/es6.object.define-property')

Object.defineProperty(exports, '__esModule', {
  value: true,
})
exports.decimalLatToDegree = decimalLatToDegree
exports.decimalLngToDegree = decimalLngToDegree
exports.p10 = p10
exports.p100 = p100
exports.decimalLatToDegreeMinutesSeconds = decimalLatToDegreeMinutesSeconds
exports.decimalLngToDegreeMinutesSeconds = decimalLngToDegreeMinutesSeconds
exports.degreeLatToDecimal = degreeLatToDecimal
exports.degreeLngToDecimal = degreeLngToDecimal
exports.degreeMinutesSecondsLatToDecimal = degreeMinutesSecondsLatToDecimal
exports.degreeMinutesSecondsLngToDecimal = degreeMinutesSecondsLngToDecimal
exports.decimalPositionToDegreeString = decimalPositionToDegreeString
exports.decimalPositionToDegreeMinutesSecondsString = decimalPositionToDegreeMinutesSecondsString

require('core-js/modules/es6.array.index-of')

require('core-js/modules/es6.regexp.to-string')

require('core-js/modules/es6.date.to-string')

require('core-js/modules/es6.object.to-string')

function decimalLatToDegree(l) {
  var array = decimalToDegree(l)
  var str = p10(array[0]) + 'º ' + p10(array[1].toFixed(3))
  if (l > 0) str = str + "' N"
  else str = str + "' S"
  return str
}

function decimalLngToDegree(l) {
  var array = decimalToDegree(l)
  var str = p100(array[0]) + 'º ' + p10(array[1].toFixed(3))
  if (l > 0) str = str + "' E"
  else str = str + "' W"
  return str
}

function p10(n) {
  return n < 10 ? '0' + n : n.toString()
}

function p100(n) {
  return n < 100 ? (n < 10 ? '00' + n : '0' + n) : n.toString()
}

function decimalLatToDegreeMinutesSeconds(l) {
  var array = decimalToDegreesMinutesSeconds(l)
  var str =
    p10(array[0]) +
    'º ' +
    p10(Math.floor(array[1])) +
    "' " +
    p10(array[2].toFixed(1))
  if (l > 0) str = str + "'' N"
  else str = str + "'' S"
  return str
}

function decimalLngToDegreeMinutesSeconds(l) {
  var array = decimalToDegreesMinutesSeconds(l)
  var str =
    p100(array[0]) +
    'º ' +
    p10(Math.floor(array[1])) +
    "' " +
    p10(array[2].toFixed(1))
  if (l > 0) str = str + "'' E"
  else str = str + "'' W"
  return str
}

function decimalToDegree(decimal) {
  var d = parseInt(decimal)
  var md = Math.abs(decimal - d) * 60
  var m = parseFloat(md)
  return [Math.abs(d), m]
}

function decimalToDegreesMinutesSeconds(decimal) {
  var degree = decimalToDegree(decimal)
  var d = parseInt(degree[1])
  var md = Math.abs(degree[1] - d) * 60
  var seconds = parseFloat(md)
  return degree.concat(seconds)
}

var decimalPartFromDegreesMinutes = function decimalPartFromDegreesMinutes(
  degree,
) {
  var i = degree.indexOf('º')
  var deg = degree.substring(0, i)
  var fdeg = parseFloat(deg)
  var i2 = degree.indexOf("'")
  var dec = degree.substring(i + 1, i2)
  var fdec = parseFloat(dec) / 60
  var decimal = fdeg + fdec
  return {
    i2: i2,
    decimal: decimal,
  }
}

function degreeLatToDecimal(degree) {
  var _decimalPartFromDegre = decimalPartFromDegreesMinutes(degree),
    i2 = _decimalPartFromDegre.i2,
    decimal = _decimalPartFromDegre.decimal

  var s = degree.substring(i2 + 1, i2 + 2)
  if (s === 'S' || s === 's') decimal = decimal * -1
  return roundTo(decimal, 5)
}

function degreeLngToDecimal(degree) {
  var _decimalPartFromDegre2 = decimalPartFromDegreesMinutes(degree),
    i2 = _decimalPartFromDegre2.i2,
    decimal = _decimalPartFromDegre2.decimal

  var s = degree.substring(i2 + 1, i2 + 2)
  if (s === 'W' || s === 'w') decimal = decimal * -1
  return roundTo(decimal, 5)
}

var decimalPartFromDegreesMinutesSeconds = function decimalPartFromDegreesMinutesSeconds(
  degree,
) {
  var i = degree.indexOf('º')
  var deg = degree.substring(0, i)
  var fdeg = parseFloat(deg)
  var i2 = degree.indexOf("'")
  var mins = degree.substring(i + 1, i2)
  var fmins = parseFloat(mins) / 60
  var i3 = degree.indexOf("''")
  var secs = degree.substring(i2 + 1, i3)
  var fsecs = parseFloat(secs) / 3600
  var decimal = fdeg + fmins + fsecs
  return {
    i3: i3,
    decimal: decimal,
  }
}

var roundTo = function roundTo(number, decimalsPositions) {
  var pow = Math.pow(10, decimalsPositions)
  return Math.round(number * pow) / pow
}

function degreeMinutesSecondsLatToDecimal(degree) {
  var _decimalPartFromDegre3 = decimalPartFromDegreesMinutesSeconds(degree),
    i3 = _decimalPartFromDegre3.i3,
    decimal = _decimalPartFromDegre3.decimal

  var s = degree.substring(i3 + 2)
  if (s === 'S' || s === 's') decimal = decimal * -1
  return roundTo(decimal, 5)
}

function degreeMinutesSecondsLngToDecimal(degree) {
  var _decimalPartFromDegre4 = decimalPartFromDegreesMinutesSeconds(degree),
    i3 = _decimalPartFromDegre4.i3,
    decimal = _decimalPartFromDegre4.decimal

  var s = degree.substring(i3 + 2)
  if (s === 'W' || s === 'w') decimal = decimal * -1
  return roundTo(decimal, 5)
}

function decimalPositionToDegreeString(lat, lng) {
  var flat = decimalLatToDegree(lat)
  var glng = decimalLngToDegree(lng)
  return flat + ' ' + glng
}

function decimalPositionToDegreeMinutesSecondsString(lat, lng) {
  var flat = decimalLatToDegreeMinutesSeconds(lat)
  var glng = decimalLngToDegreeMinutesSeconds(lng)
  return [flat, glng]
}
