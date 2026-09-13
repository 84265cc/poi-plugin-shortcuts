'use strict'

const runtime = require('./runtime')

exports.pluginDidLoad = runtime.mount
exports.pluginWillUnload = runtime.unmount
