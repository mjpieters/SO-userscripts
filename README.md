# SO-userscripts

![current version](https://img.shields.io/github/v/tag/mjpieters/SO-userscripts?color=green&label=version&logo=github)
![MIT license](https://img.shields.io/github/license/mjpieters/SO-userscripts)

User scripts for use on Stack Exchange websites. You can install these by clicking on the install link for each individual script from their individual README files, listed below.

## Scripts

* ♦ [Connected users](./scripts/connected-users/README.md): Userscript to aid investigation of connected users on the moderator-only IP cross-reference view. **Requires ♦ moderator access**.

## Deprecated

These scripts are deprecated and no longer receive support.

* [Bookmark users](./scripts/bookmark-users/README.md): Fetch the list of users that bookmarked a question on any Stack Exchange website. Stack Exchange [replaced the bookmark feature with "saves"][bookmarks-evolved], which are now private, so this script no longer works.

[bookmarks-evolved]: https://meta.stackexchange.com/questions/382019/bookmarks-have-evolved-into-saves

## License

All scripts are [MIT licensed](./LICENSE).

## Issues and suggestions

[![GitHub issues](https://img.shields.io/github/issues/mjpieters/SO-userscripts)][issues]
[![GitHub pull requests](https://img.shields.io/github/issues-pr/mjpieters/SO-userscripts)][prs]

Feature requests and bug reports are most welcome, please use the [GitHub issue tracker][issues]. Issues with accompanying [pull requests][prs] are even more awesome!

[issues]: https://github.com/mjpieters/SO-userscripts/issues
[prs]: https://github.com/mjpieters/SO-userscripts/pulls
## Development

Scripts are written in TypeScript and compiled and packaged as userscripts (JavaScript files with a header), using webpack.

Please install [`nvm`](https://github.com/nvm-sh/nvm) and [`yarn`](https://yarnpkg.com/), then run `nvm use` and `yarn install` to get set up.

Then run `yarn run serve` to start a web server on port 8842, serving the scripts from an index page. Alternatively, run `yarn run build:dev` to create a local development build in `dist/`. You can alter the port number by setting the `DEV_SERVER_PORT` environment variable.

### Reloading scripts under development

It's easiest to install the 'proxy.user.js' variant, as this way you can just reload your browser page (twice) to have Tampermonkey pick up changes. Do set Tampermonkey to always refresh `@require`-ed resources (`Settings` -> `Externals` -> `Update Interval` -> *Always*).  Remember to switch back to the regular variant once you are done.

### Releasing

A GitHub workflow handles releasing from the main branch into `dist/`.