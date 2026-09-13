'use strict'

const PLUGIN_ID = 'poi-plugin-shortcuts'
const FAVORITES_PATH = 'plugin.poi-plugin-shortcuts.favorites'

const normalizeFavorites = value => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.filter(id => {
    if (typeof id !== 'string' || !id || id === PLUGIN_ID || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const toggleFavorite = (favorites, pluginId) => {
  const normalized = normalizeFavorites(favorites)
  if (typeof pluginId !== 'string' || !pluginId || pluginId === PLUGIN_ID) return normalized
  if (normalized.includes(pluginId)) return normalized.filter(id => id !== pluginId)
  return [...normalized, pluginId]
}

const isListedPlugin = plugin => Boolean(
  plugin && plugin.id !== PLUGIN_ID && plugin.enabled &&
  (plugin.handleClick || plugin.windowURL || plugin.reactClass),
)

const getListedPlugins = plugins => (Array.isArray(plugins) ? plugins : []).filter(isListedPlugin)

const getFavoritePlugins = (plugins, favorites) => {
  const byId = new Map(getListedPlugins(plugins).map(plugin => [plugin.id, plugin]))
  return normalizeFavorites(favorites).map(id => byId.get(id)).filter(Boolean)
}

module.exports = {
  FAVORITES_PATH,
  PLUGIN_ID,
  getFavoritePlugins,
  getListedPlugins,
  normalizeFavorites,
  toggleFavorite,
}
