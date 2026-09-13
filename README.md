# poi-plugin-shortcuts

Icon-only favorite plugin shortcuts for poi.

## Features

- Adds plugin shortcuts between poi's message area and map reminder.
- Uses each plugin's existing icon; shortcuts contain icons only.
- Hover a plugin item in the plugin grid to reveal its favorite star.
- Favorited plugins appear in the order they were added.
- Unfavoriting and favoriting again moves a plugin to the end.
- Clicking a shortcut uses poi's existing plugin focus/open handler.
- Uses Blueprint class names from the installed poi version, supporting poi 11 and 12.

Favorites are stored at `plugin.poi-plugin-shortcuts.favorites` in poi's configuration.

## Installation

Copy this directory to poi's extra plugin directory as `poi-plugin-shortcuts`, then restart poi or reload plugins.

## Test

```sh
npm test
```

## License

MIT
