# Changelog

## [0.11.2](https://github.com/JoshuaKGoldberg/formatly/compare/0.11.1...0.11.2) (2026-09-27)

### Bug Fixes

- throw a descriptive error when a directory cannot be read ([#656](https://github.com/JoshuaKGoldberg/formatly/issues/656)) ([f836a62](https://github.com/JoshuaKGoldberg/formatly/commit/f836a62aa2ae49245dc4b16e66b9a10a4b9929b2)), closes [#654](https://github.com/JoshuaKGoldberg/formatly/issues/654)

## [0.11.1](https://github.com/JoshuaKGoldberg/formatly/compare/0.11.0...0.11.1) (2026-09-27)

### Bug Fixes

- throw a descriptive error for unknown formatter option names ([#655](https://github.com/JoshuaKGoldberg/formatly/issues/655)) ([6312bf3](https://github.com/JoshuaKGoldberg/formatly/commit/6312bf335ab343d13b1b127196ddc1f66886744c)), closes [#653](https://github.com/JoshuaKGoldberg/formatly/issues/653)

## [0.11.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.10.0...0.11.0) (2026-09-27)

### Features

- add formatFiles to format or check many files in one invocation ([#643](https://github.com/JoshuaKGoldberg/formatly/issues/643)) ([ddef000](https://github.com/JoshuaKGoldberg/formatly/commit/ddef000eac9d16498d9cbec17e7d6ed5fcc6f68d)), closes [#631](https://github.com/JoshuaKGoldberg/formatly/issues/631)
- format with Biome in-process via @biomejs/js-api when installed ([#645](https://github.com/JoshuaKGoldberg/formatly/issues/645)) ([55e5442](https://github.com/JoshuaKGoldberg/formatly/commit/55e5442b93fe0f2ef1e322f83099e405ab7c0d7e)), closes [#633](https://github.com/JoshuaKGoldberg/formatly/issues/633)
- format with dprint through a long-lived editor-service process ([#644](https://github.com/JoshuaKGoldberg/formatly/issues/644)) ([f685796](https://github.com/JoshuaKGoldberg/formatly/commit/f685796f37060e7d8538bec23c69995453003cfa)), closes [#632](https://github.com/JoshuaKGoldberg/formatly/issues/632)

### Bug Fixes

- correct README formatly example and formatFiles failure type ([#652](https://github.com/JoshuaKGoldberg/formatly/issues/652)) ([16605a5](https://github.com/JoshuaKGoldberg/formatly/commit/16605a5316a84957ee4a28c1ebe8d6a9667ca2b9))
- don't hang on formatter output or crash on spawn errors ([#649](https://github.com/JoshuaKGoldberg/formatly/issues/649)) ([7e059c4](https://github.com/JoshuaKGoldberg/formatly/commit/7e059c41976f83b92e9cf83265b26d44e3c08d40))
- handle excluded and unsupported files consistently across formatters ([#651](https://github.com/JoshuaKGoldberg/formatly/issues/651)) ([5e4628a](https://github.com/JoshuaKGoldberg/formatly/commit/5e4628a7c38708d8788de2de8985991d7d0afa0b))
- report in-process Prettier failures and skip unknown files ([#646](https://github.com/JoshuaKGoldberg/formatly/issues/646)) ([182deb7](https://github.com/JoshuaKGoldberg/formatly/commit/182deb72a1754c032f9c059a941339afe3a9f701)), closes [#636](https://github.com/JoshuaKGoldberg/formatly/issues/636)
- support relative cwds and concurrent in-process Prettier runs ([#650](https://github.com/JoshuaKGoldberg/formatly/issues/650)) ([6adc23b](https://github.com/JoshuaKGoldberg/formatly/commit/6adc23b619c48fdaa6c696d604f2a39378751fb9))

## [0.10.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.9.1...0.10.0) (2026-09-27)

### Features

- spawn formatters from node_modules/.bin before the package manager ([#642](https://github.com/JoshuaKGoldberg/formatly/issues/642)) ([b59de83](https://github.com/JoshuaKGoldberg/formatly/commit/b59de83b8e0ce51bed9b77aa2bce286f29b60df6)), closes [#629](https://github.com/JoshuaKGoldberg/formatly/issues/629)

### Bug Fixes

- exit with an error when the formatter process fails ([#635](https://github.com/JoshuaKGoldberg/formatly/issues/635)) ([6fcabfb](https://github.com/JoshuaKGoldberg/formatly/commit/6fcabfbf74b2449b66ab58768290890a89d84e2b)), closes [#625](https://github.com/JoshuaKGoldberg/formatly/issues/625)
- honor Deno's fmt.exclude in formatText ([#639](https://github.com/JoshuaKGoldberg/formatly/issues/639)) ([ea9d5df](https://github.com/JoshuaKGoldberg/formatly/commit/ea9d5dfce2ba36acaea83764d07d8d2f740669f8)), closes [#626](https://github.com/JoshuaKGoldberg/formatly/issues/626)
- limit concurrent formatText child processes ([#641](https://github.com/JoshuaKGoldberg/formatly/issues/641)) ([8c52ac7](https://github.com/JoshuaKGoldberg/formatly/commit/8c52ac76f804cc58e90681cf4dd196386549a1e0)), closes [#628](https://github.com/JoshuaKGoldberg/formatly/issues/628)
- run oxfmt through the project's package manager ([#640](https://github.com/JoshuaKGoldberg/formatly/issues/640)) ([340998a](https://github.com/JoshuaKGoldberg/formatly/commit/340998a6bf96b00aa1cd4281d9c5b4b899455024)), closes [#627](https://github.com/JoshuaKGoldberg/formatly/issues/627)

## [0.9.1](https://github.com/JoshuaKGoldberg/formatly/compare/0.9.0...0.9.1) (2026-09-25)

### Bug Fixes

- run Biome by its bin name under pnpm and other package managers ([#634](https://github.com/JoshuaKGoldberg/formatly/issues/634)) ([ff59125](https://github.com/JoshuaKGoldberg/formatly/commit/ff591253c0e89504e7017f2c1db5d2bfdecda9ac)), closes [#624](https://github.com/JoshuaKGoldberg/formatly/issues/624)

## [0.9.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.8.0...0.9.0) (2026-09-21)

### Features

- add --dry-run flag to report the detected formatter without formatting ([#617](https://github.com/JoshuaKGoldberg/formatly/issues/617)) ([bca70ff](https://github.com/JoshuaKGoldberg/formatly/commit/bca70ff6afb2c7b339cff76f1a1fd751bc8c1bd1)), closes [#575](https://github.com/JoshuaKGoldberg/formatly/issues/575)

## [0.8.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.7.1...0.8.0) (2026-09-19)

### Features

- add format API for formatting text in memory ([#613](https://github.com/JoshuaKGoldberg/formatly/issues/613)) ([c9475cd](https://github.com/JoshuaKGoldberg/formatly/commit/c9475cdab870ab8a301ba1c193d0874ed95db90d)), closes [#11](https://github.com/JoshuaKGoldberg/formatly/issues/11)

## [0.7.1](https://github.com/JoshuaKGoldberg/formatly/compare/0.7.0...0.7.1) (2026-09-19)

### Bug Fixes

- load Prettier's legacy internal CLI and respect cwd when formatting in-memory ([#612](https://github.com/JoshuaKGoldberg/formatly/issues/612)) ([7428598](https://github.com/JoshuaKGoldberg/formatly/commit/74285984df5344871b09023fc9e13eab1235df09)), closes [#574](https://github.com/JoshuaKGoldberg/formatly/issues/574) [#563](https://github.com/JoshuaKGoldberg/formatly/issues/563), references [#574](https://github.com/JoshuaKGoldberg/formatly/issues/574) [#563](https://github.com/JoshuaKGoldberg/formatly/issues/563)

## [0.7.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.6.0...0.7.0) (2026-08-19)

### Features

- add order option to prefer formatters during detection ([#569](https://github.com/JoshuaKGoldberg/formatly/issues/569)) ([c40766c](https://github.com/JoshuaKGoldberg/formatly/commit/c40766cd6ba6cd0a426447c4e7252fedf6f9f994)), closes [#113](https://github.com/JoshuaKGoldberg/formatly/issues/113)
- print detected formatter name in the CLI ([#570](https://github.com/JoshuaKGoldberg/formatly/issues/570)) ([5c3f811](https://github.com/JoshuaKGoldberg/formatly/commit/5c3f811e89d83a647213d765f25029df84d14788)), closes [#123](https://github.com/JoshuaKGoldberg/formatly/issues/123)

### Bug Fixes

- say formatter, not reporter, when detection fails ([#571](https://github.com/JoshuaKGoldberg/formatly/issues/571)) ([519878d](https://github.com/JoshuaKGoldberg/formatly/commit/519878d11a95f9764987edd811053be4f530585b)), closes [#124](https://github.com/JoshuaKGoldberg/formatly/issues/124)

## [0.6.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.5.0...0.6.0) (2026-08-19)

### Features

- add stopDirectory option for parent directory searching ([#568](https://github.com/JoshuaKGoldberg/formatly/issues/568)) ([5337bdc](https://github.com/JoshuaKGoldberg/formatly/commit/5337bdce5c184bfc2c0cbe049560eb2083578735)), closes [#54](https://github.com/JoshuaKGoldberg/formatly/issues/54)

## [0.5.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.4.0...0.5.0) (2026-08-19)

### Features

- use project package manager to run formatters ([#545](https://github.com/JoshuaKGoldberg/formatly/issues/545)) ([4485504](https://github.com/JoshuaKGoldberg/formatly/commit/4485504a7fdd1d75a89b7bc0e6e795616af817ca)), closes [#112](https://github.com/JoshuaKGoldberg/formatly/issues/112)

### Bug Fixes

- pass oxfmt to createRunCommand as a resolved command ([#566](https://github.com/JoshuaKGoldberg/formatly/issues/566)) ([9f30657](https://github.com/JoshuaKGoldberg/formatly/commit/9f306576d2928bc7718955281d27c58ea84e64dd)), closes [#573](https://github.com/JoshuaKGoldberg/formatly/issues/573), references [#544](https://github.com/JoshuaKGoldberg/formatly/issues/544)

## [0.4.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.3.0...0.4.0) (2026-08-14)

### Features

- add oxfmt support ([#544](https://github.com/JoshuaKGoldberg/formatly/issues/544)) ([69cc5f2](https://github.com/JoshuaKGoldberg/formatly/commit/69cc5f2d940158ad3d810808cd4ebba15f4e1298)), closes [#546](https://github.com/JoshuaKGoldberg/formatly/issues/546)

# [0.3.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.2.4...0.3.0) (2025-06-12)

### Features

- use Prettier's CLI function in-memory if possible ([#144](https://github.com/JoshuaKGoldberg/formatly/issues/144)) ([cd31aab](https://github.com/JoshuaKGoldberg/formatly/commit/cd31aabfe564588d6324cb056d960b0753bea4bc)), closes [#114](https://github.com/JoshuaKGoldberg/formatly/issues/114)

## [0.2.4](https://github.com/JoshuaKGoldberg/formatly/compare/0.2.3...0.2.4) (2025-06-02)

### Bug Fixes

- **deps:** update dependency fd-package-json to v2 ([#171](https://github.com/JoshuaKGoldberg/formatly/issues/171)) ([cf84d65](https://github.com/JoshuaKGoldberg/formatly/commit/cf84d657e199ecca78cbffeb4c9101f444f79c8d))

## [0.2.3](https://github.com/JoshuaKGoldberg/formatly/compare/0.2.2...0.2.3) (2025-05-02)

### Bug Fixes

- respect `options.cwd` when running formatter ([#131](https://github.com/JoshuaKGoldberg/formatly/issues/131)) ([ca02868](https://github.com/JoshuaKGoldberg/formatly/commit/ca0286817eadc10c689d7848160fbc7940bb58fb)), closes [#130](https://github.com/JoshuaKGoldberg/formatly/issues/130)

## [0.2.2](https://github.com/JoshuaKGoldberg/formatly/compare/0.2.1...0.2.2) (2025-04-23)

### Bug Fixes

- add `fmt` to dprint command ([#127](https://github.com/JoshuaKGoldberg/formatly/issues/127)) ([f9944c3](https://github.com/JoshuaKGoldberg/formatly/commit/f9944c38c62b1669f865de225b434df4d2a61238)), closes [#126](https://github.com/JoshuaKGoldberg/formatly/issues/126) [#125](https://github.com/JoshuaKGoldberg/formatly/issues/125)

## [0.2.1](https://github.com/JoshuaKGoldberg/formatly/compare/0.2.0...0.2.1) (2025-04-14)

### Bug Fixes

- switch from read-package-up to fd-package-json ([#99](https://github.com/JoshuaKGoldberg/formatly/issues/99)) ([7b8cddb](https://github.com/JoshuaKGoldberg/formatly/commit/7b8cddbadc78b9fb1c6c0b353bac6679f95c1b98)), closes [#98](https://github.com/JoshuaKGoldberg/formatly/issues/98)

# [0.2.0](https://github.com/JoshuaKGoldberg/formatly/compare/0.1.0...0.2.0) (2025-03-31)

### Bug Fixes

- bump to create-typescript-app@2 with transitions action ([#81](https://github.com/JoshuaKGoldberg/formatly/issues/81)) ([e8622e7](https://github.com/JoshuaKGoldberg/formatly/commit/e8622e711cb2033ad653838693721671b99743b6)), closes [#74](https://github.com/JoshuaKGoldberg/formatly/issues/74)

### Features

- empty commit to trigger CI release ([d96f6a1](https://github.com/JoshuaKGoldberg/formatly/commit/d96f6a1e8b1e3150da5a73ae8c590bd84de27c4e))
- remove execa dependency ([#69](https://github.com/JoshuaKGoldberg/formatly/issues/69)) ([664b6d4](https://github.com/JoshuaKGoldberg/formatly/commit/664b6d499031769f0abf6f93d3a5fdd564f8c379)), closes [#55](https://github.com/JoshuaKGoldberg/formatly/issues/55)
- support explicit formatter ([#71](https://github.com/JoshuaKGoldberg/formatly/issues/71)) ([c96058b](https://github.com/JoshuaKGoldberg/formatly/commit/c96058bff91e47e39e851451f23905c2d116d20d)), closes [#73](https://github.com/JoshuaKGoldberg/formatly/issues/73)

# 0.1.0 (2025-01-08)

### Features

- initial features ✨ ([12130ab](https://github.com/JoshuaKGoldberg/formatly/commit/12130ab62d1198acfbd8360aa5babe94e2c413d0))
- initialized repo ✨ ([199c66c](https://github.com/JoshuaKGoldberg/formatly/commit/199c66cfef24c0e86c57a3cd83843764a9698210))
