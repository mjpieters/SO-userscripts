# SO-userscripts

[![current version][badge_current_version]][latest]
[![MIT license][badge_license]](./LICENSE)

User scripts for use on Stack Exchange websites. You can install these by clicking on the install link for each individual script from their individual README files, listed below.

> [!WARNING]  
> This repository is no longer being maintained. Use the code here at your own risk, I am no longer a moderator and can't fix these.

## Scripts

* ♦ [Connected users](./scripts/connected-users/README.md): Userscript to aid investigation of connected users on the moderator-only IP cross-reference view. **Requires ♦ moderator access**.

## Deprecated

These scripts are deprecated and no longer receive support.

* [Bookmark users](./scripts/bookmark-users/README.md): Fetch the list of users that bookmarked a question on any Stack Exchange website. Stack Exchange [replaced the bookmark feature with "saves"][bookmarks-evolved], which are now private, so this script no longer works.

[bookmarks-evolved]: https://meta.stackexchange.com/questions/382019/bookmarks-have-evolved-into-saves

## License

All scripts are [MIT licensed](./LICENSE).

## Issues and suggestions

[![GitHub issues][badge_issues]][issues]
[![GitHub pull requests][badge_prs]][prs]

Feature requests and bug reports are most welcome, please use the [GitHub issue tracker][issues]. Issues with accompanying [pull requests][prs] are even more awesome!

## Development

Scripts are written in TypeScript and compiled and packaged as userscripts (JavaScript files with a header), using webpack.

Please install [`nvm`](https://github.com/nvm-sh/nvm) and [`yarn`](https://yarnpkg.com/), then run `nvm use` and `yarn install` to get set up.

Then run `yarn run serve` to start a web server on port 8842, serving the scripts from an index page. Alternatively, run `yarn run build:dev` to create a local development build in `dist/`. You can alter the port number by setting the `DEV_SERVER_PORT` environment variable.

Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) pattern; if the commit affects a specific userscript, use the script directory name as the tag (e.g. `fix(connected-users): ...`). A [`commitlint` configuration](https://commitlint.js.org/) is provided and commit messages are verified at commit time with Husky.

### Reloading scripts under development

Open the `yarn run serve` development server URL in your browser and pick one of the following options to facilitate reloading changes:

- Install the `.user.js` file, your userscript manager should automatically install it when you click on it. Some managers have explicit support for watching for updates; e.g. when using ViolentMonkey, [just leave the ViolentMonkey tab open](https://violentmonkey.github.io/posts/how-to-edit-scripts-with-your-favorite-editor/#edit-and-sync) and revisit that tab to trigger a reload.

-  Install the `proxy.user.js` variant, as this way you can just reload your browser page for the usermanager to pick up the latest changes (you may have to reload twice, e.g. when using Tampermonkey) pick up changes). You may have to configure your user manager to always refresh `@require` resources (Tampermonkey: `Settings` -> `Externals` -> `Update Interval` -> *`Always`*).

Remember to switch back to the released version once you are done, especially when using the `proxy.user.js` technique.

### Releasing

A GitHub workflow handles releasing from the main branch, updating the version number based on the conventional commit messages pushed to the branch since the last release. 

[latest]: https://github.com/mjpieters/SO-userscripts/releases/latest
[issues]: https://github.com/mjpieters/SO-userscripts/issues
[prs]: https://github.com/mjpieters/SO-userscripts/pulls

[badge_current_version]: https://img.shields.io/github/v/tag/mjpieters/SO-userscripts?color=green&label=version&logo=github
[badge_license]: https://img.shields.io/github/license/mjpieters/SO-userscripts
[badge_issues]: https://img.shields.io/github/issues/mjpieters/SO-userscripts
[badge_prs]: https://img.shields.io/github/issues/mjpieters/SO-userscripts
