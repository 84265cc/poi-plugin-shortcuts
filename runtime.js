'use strict'

const React = require('react')
const ReactDOM = require('react-dom')
const Blueprint = require('@blueprintjs/core')
const remote = require('@electron/remote')
const ipc = remote.require('./lib/ipc')
const {
  FAVORITES_PATH,
  getFavoritePlugins,
  getListedPlugins,
  normalizeFavorites,
  toggleFavorite,
} = require('./core')

const STYLE_ID = 'poi-plugin-shortcuts-style'
const ROOT_CLASS = 'poi-plugin-shortcuts-root'
const STAR_CLASS = 'poi-plugin-shortcuts-star'
const HOST_CLASS = 'poi-plugin-shortcuts-star-host'
const RECONCILE_INTERVAL_MS = 1000
const BUTTON_CLASS = Blueprint.Classes.BUTTON
const MINIMAL_CLASS = Blueprint.Classes.MINIMAL
const MENU_CLASS = Blueprint.Classes.MENU
const MENU_ITEM_CLASS = Blueprint.Classes.MENU_ITEM

let observer = null
let reconcileTimer = null
let reconcileScheduled = false

const getPlugins = () => getListedPlugins(window.getStore('plugins'))
const getFavorites = () => normalizeFavorites(window.config.get(FAVORITES_PATH, []))

const openPlugin = plugin => {
  const focusPlugin = ipc.access('MainWindow')?.ipcFocusPlugin
  if (typeof focusPlugin === 'function') {
    focusPlugin(plugin.id)
    return
  }
  if (typeof plugin.handleClick === 'function') {
    plugin.handleClick()
    return
  }
  const doubleTabbed = window.config.get('poi.tabarea.double', false)
  window.dispatch({
    type: '@@TabSwitch',
    tabInfo: doubleTabbed
      ? { activePluginName: plugin.id }
      : { activeMainTab: plugin.id, activePluginName: plugin.id },
  })
}

const ShortcutBar = ({ plugins }) => React.createElement(
  React.Fragment,
  null,
  plugins.map(plugin => React.createElement(
    'button',
    {
      'aria-label': plugin.name,
      className: `${BUTTON_CLASS} ${MINIMAL_CLASS} poi-plugin-shortcuts-button`,
      key: plugin.id,
      onClick: () => openPlugin(plugin),
      title: plugin.name,
      type: 'button',
    },
    plugin.displayIcon
      ? React.cloneElement(plugin.displayIcon, { 'aria-hidden': true })
      : React.createElement('span', { className: 'fa fa-th-large', 'aria-hidden': true }),
  )),
)

const ensureStyle = () => {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    poi-plugin-shortcuts.${ROOT_CLASS} {
      align-items: stretch;
      display: flex;
      flex: 0 0 auto;
      height: 30px;
      overflow: hidden;
      width: auto;
    }
    poi-plugin-shortcuts.${ROOT_CLASS} > .poi-plugin-shortcuts-button {
      border-radius: 0;
      flex: 0 0 34px;
      height: 30px;
      min-height: 30px;
      min-width: 34px;
      padding: 0;
    }
    .${MENU_CLASS} .${MENU_ITEM_CLASS}.${HOST_CLASS} {
      padding-right: 34px;
      position: relative;
    }
    .${MENU_CLASS} .${STAR_CLASS} {
      align-items: center;
      color: #ffc107;
      cursor: pointer;
      display: inline-flex;
      font-size: 18px;
      height: 28px;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      position: absolute;
      right: 3px;
      top: 50%;
      transform: translateY(-50%);
      transition: opacity 100ms ease;
      width: 28px;
      z-index: 3;
    }
    .${MENU_CLASS} .${MENU_ITEM_CLASS}.${HOST_CLASS}:hover > .${STAR_CLASS},
    .${MENU_CLASS} .${MENU_ITEM_CLASS}.${HOST_CLASS}:focus-within > .${STAR_CLASS},
    .${MENU_CLASS} .${STAR_CLASS}:focus {
      opacity: 1;
      pointer-events: auto;
    }
  `
  document.head.appendChild(style)
}

const saveFavorite = pluginId => {
  window.config.set(FAVORITES_PATH, toggleFavorite(getFavorites(), pluginId))
  reconcile()
}

const stopMenuActivation = event => {
  event.preventDefault()
  event.stopPropagation()
}

const createStar = plugin => {
  const star = document.createElement('span')
  star.className = STAR_CLASS
  star.dataset.pluginId = plugin.id
  star.setAttribute('role', 'button')
  star.setAttribute('tabindex', '0')
  star.addEventListener('mousedown', stopMenuActivation)
  star.addEventListener('pointerdown', stopMenuActivation)
  star.addEventListener('click', event => {
    stopMenuActivation(event)
    saveFavorite(plugin.id)
  })
  star.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      stopMenuActivation(event)
      saveFavorite(plugin.id)
    }
  })
  return star
}

const updateStar = (star, plugin, favoriteIds) => {
  const favorite = favoriteIds.has(plugin.id)
  const glyph = favorite ? '★' : '☆'
  if (star.textContent !== glyph) star.textContent = glyph
  star.setAttribute('aria-label', favorite ? `取消收藏 ${plugin.name}` : `收藏 ${plugin.name}`)
  star.title = favorite ? '取消收藏' : '加入快捷列'
}

const decoratePluginMenus = plugins => {
  const favorites = new Set(getFavorites())
  const pluginsById = new Map(plugins.map(plugin => [plugin.id, plugin]))
  document.querySelectorAll(`.${MENU_CLASS}`).forEach(menu => {
    const items = Array.from(menu.querySelectorAll(`.${MENU_ITEM_CLASS}`))
      .filter(item => item.closest(`.${MENU_CLASS}`) === menu)
    if (!items.some(item => pluginsById.has(item.id))) return
    items.forEach((item, index) => {
      const plugin = pluginsById.get(item.id) || plugins[index]
      if (!plugin) return
      item.classList.add(HOST_CLASS)
      let star = Array.from(item.children).find(child => child.classList?.contains(STAR_CLASS))
      if (!star || star.dataset.pluginId !== plugin.id) {
        if (star) star.remove()
        star = createStar(plugin)
        item.appendChild(star)
      }
      updateStar(star, plugin, favorites)
    })
  })
}

const renderShortcutBars = plugins => {
  const favoritePlugins = getFavoritePlugins(plugins, getFavorites())
  document.querySelectorAll('poi-info').forEach(infoBar => {
    const mapReminder = Array.from(infoBar.children)
      .find(child => child.tagName?.toLowerCase() === 'poi-map-reminder')
    if (!mapReminder) return
    let root = Array.from(infoBar.children).find(child => child.classList?.contains(ROOT_CLASS))
    if (!root) {
      root = document.createElement('poi-plugin-shortcuts')
      root.className = ROOT_CLASS
      infoBar.insertBefore(root, mapReminder)
    } else if (root.nextSibling !== mapReminder) {
      infoBar.insertBefore(root, mapReminder)
    }
    ReactDOM.render(React.createElement(ShortcutBar, { plugins: favoritePlugins }), root)
  })
}

const reconcile = () => {
  if (!document.head) return
  ensureStyle()
  const plugins = getPlugins()
  decoratePluginMenus(plugins)
  renderShortcutBars(plugins)
}

const scheduleReconcile = () => {
  if (reconcileScheduled) return
  reconcileScheduled = true
  setTimeout(() => {
    reconcileScheduled = false
    reconcile()
  }, 0)
}

const handleConfigChange = path => {
  if (path === FAVORITES_PATH || path.startsWith('poi.plugin.windowmode')) scheduleReconcile()
}

const mount = () => {
  if (observer) return
  ensureStyle()
  observer = new MutationObserver(scheduleReconcile)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.config.addListener('config.set', handleConfigChange)
  reconcileTimer = setInterval(reconcile, RECONCILE_INTERVAL_MS)
  reconcile()
}

const unmount = () => {
  if (observer) observer.disconnect()
  observer = null
  if (reconcileTimer) clearInterval(reconcileTimer)
  reconcileTimer = null
  reconcileScheduled = false
  window.config.removeListener('config.set', handleConfigChange)
  document.querySelectorAll(`poi-plugin-shortcuts.${ROOT_CLASS}`).forEach(root => {
    ReactDOM.unmountComponentAtNode(root)
    root.remove()
  })
  document.querySelectorAll(`.${STAR_CLASS}`).forEach(star => star.remove())
  document.querySelectorAll(`.${HOST_CLASS}`).forEach(item => item.classList.remove(HOST_CLASS))
  document.getElementById(STYLE_ID)?.remove()
}

module.exports = { mount, unmount }
