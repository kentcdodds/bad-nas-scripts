'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true,
})
exports.GeographicCoordinateConverter = exports.CoordinateConverter = void 0

require('core-js/modules/es6.object.define-property')

require('core-js/modules/es6.regexp.replace')

require('core-js/modules/es6.array.index-of')

require('core-js/modules/es6.number.constructor')

require('core-js/modules/es6.number.parse-float')

require('core-js/modules/es6.regexp.split')

require('core-js/modules/es6.array.is-array')

var _utils = require('./utils')

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function')
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i]
    descriptor.enumerable = descriptor.enumerable || false
    descriptor.configurable = true
    if ('value' in descriptor) descriptor.writable = true
    Object.defineProperty(target, descriptor.key, descriptor)
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps)
  if (staticProps) _defineProperties(Constructor, staticProps)
  return Constructor
}

var GeographicCoordinateConverterBuilder = /*#__PURE__*/ (function() {
  function GeographicCoordinateConverterBuilder() {
    _classCallCheck(this, GeographicCoordinateConverterBuilder)
  }

  _createClass(GeographicCoordinateConverterBuilder, [
    {
      key: 'fromDecimal',

      /***
       * Return a converter instance from an array of coordinates or from a string
       * @param coordinate string|array
       * @returns {GeographicCoordinateConverter}
       */
      value: function fromDecimal(coordinate) {
        if (Array.isArray(coordinate)) {
          return new GeographicCoordinateConverter(coordinate[0], coordinate[1])
        } else {
          var latlng = coordinate.split(' ')
          return new GeographicCoordinateConverter(
            Number.parseFloat(latlng[0]),
            Number.parseFloat(latlng[1]),
          )
        }
      },
      /**
       * Return a converter instance from a degree coordinate string
       * @param coordinate string
       * @returns {GeographicCoordinateConverter}
       */
    },
    {
      key: 'fromDegreeMinutes',
      value: function fromDegreeMinutes(coordinate) {
        var slicePoint = Math.max(
          coordinate.indexOf('s'),
          coordinate.indexOf('S'),
          coordinate.indexOf('n'),
          coordinate.indexOf('N'),
        )
        var latDecimal = coordinate.slice(0, slicePoint + 1).replace(/\s/g, '')
        var lngDecimal = coordinate.slice(slicePoint + 2).replace(/\s/g, '')
        return new GeographicCoordinateConverter(
          (0, _utils.degreeLatToDecimal)(latDecimal),
          (0, _utils.degreeLngToDecimal)(lngDecimal),
        )
      },
      /**
       * Return a converter instance from a degree minutes seconds coordinate string
       * @param coordinate string
       * @returns {GeographicCoordinateConverter}
       */
    },
    {
      key: 'fromDegreeMinutesSeconds',
      value: function fromDegreeMinutesSeconds(coordinate) {
        var slicePoint = Math.max(
          coordinate.indexOf('s'),
          coordinate.indexOf('S'),
          coordinate.indexOf('n'),
          coordinate.indexOf('N'),
        )
        var latDecimal = coordinate.slice(0, slicePoint + 1).replace(/\s/g, '')
        var lngDecimal = coordinate.slice(slicePoint + 2).replace(/\s/g, '')
        return new GeographicCoordinateConverter(
          (0, _utils.degreeMinutesSecondsLatToDecimal)(latDecimal),
          (0, _utils.degreeMinutesSecondsLngToDecimal)(lngDecimal),
        )
      },
    },
  ])

  return GeographicCoordinateConverterBuilder
})()

var CoordinateConverter = new GeographicCoordinateConverterBuilder()
exports.CoordinateConverter = CoordinateConverter

var GeographicCoordinateConverter = /*#__PURE__*/ (function() {
  function GeographicCoordinateConverter(lat, lng) {
    _classCallCheck(this, GeographicCoordinateConverter)

    this.lat = lat
    this.lng = lng
  }
  /**
   * Returns a string in decimal format
   * @returns {string}
   */

  _createClass(GeographicCoordinateConverter, [
    {
      key: 'toDecimal',
      value: function toDecimal() {
        return ''.concat(this.lat, ' ').concat(this.lng)
      },
      /**
       * Returns a array of latitude longitude
       * @returns {*[]}
       */
    },
    {
      key: 'toDecimalArray',
      value: function toDecimalArray() {
        return [this.lat, this.lng]
      },
      /**
       * Returns a string in degree format
       * @returns {*}
       */
    },
    {
      key: 'toDegreeMinutes',
      value: function toDegreeMinutes() {
        return (0, _utils.decimalPositionToDegreeString)(this.lat, this.lng)
      },
      /**
       * Returns a string in decimal minutes seconds format
       * @returns {*}
       */
    },
    {
      key: 'toDegreeMinutesSeconds',
      value: function toDegreeMinutesSeconds() {
        return (0, _utils.decimalPositionToDegreeMinutesSecondsString)(
          this.lat,
          this.lng,
        )
      },
    },
  ])

  return GeographicCoordinateConverter
})()

exports.GeographicCoordinateConverter = GeographicCoordinateConverter
