'use strict'

const assert = require('assert')
const {
  PLUGIN_ID,
  getFavoritePlugins,
  getListedPlugins,
  normalizeFavorites,
  toggleFavorite,
} = require('./core')

const plugins = [
  { id: 'alpha', enabled: true, reactClass: function Alpha() {} },
  { id: 'windowed', enabled: true, handleClick: () => {} },
  { id: 'disabled', enabled: false, reactClass: function Disabled() {} },
  { id: 'no-view', enabled: true },
  { id: PLUGIN_ID, enabled: true, reactClass: function Self() {} },
]

assert.deepStrictEqual(normalizeFavorites(null), [])
assert.deepStrictEqual(normalizeFavorites(['alpha', 'alpha', '', PLUGIN_ID, 3, 'windowed']), ['alpha', 'windowed'])
assert.deepStrictEqual(toggleFavorite(['alpha'], 'windowed'), ['alpha', 'windowed'])
assert.deepStrictEqual(toggleFavorite(['alpha', 'windowed'], 'alpha'), ['windowed'])
assert.deepStrictEqual(getListedPlugins(plugins).map(plugin => plugin.id), ['alpha', 'windowed'])
assert.deepStrictEqual(
  getFavoritePlugins(plugins, ['windowed', 'disabled', 'missing', 'alpha']).map(plugin => plugin.id),
  ['windowed', 'alpha'],
)

console.log('poi-plugin-shortcuts tests passed')
