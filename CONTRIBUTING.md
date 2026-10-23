# Contributing

Parity Scrollr is a local-first visual review tool for desktop Chrome and Microsoft Edge. Keep comparison data local, make site access explicit, and preserve cleanup when a comparison ends.

## Development

Use a supported Node.js LTS release and the system `bash`, `zip`, `unzip`, and `shasum` commands. There are no npm dependencies or compilation steps.

```sh
npm test
npm run package
cd dist
shasum -a 256 -c SHA256SUMS
```

Load the repository or an extracted browser package with Load unpacked. End comparisons before reloading an installed extension. See [INSTALL.md](INSTALL.md).

## Changes

- Keep runtime files on the explicit allowlist in `scripts/package-extension.sh`.
- Add behavioral regressions for lifecycle, permissions, scrolling, storage, and capture changes.
- Verify affected workflows in an installed extension. Node tests and ZIP checks do not exercise the browser permission UI or establish rendered acceptance.
- Use the pinned App Stylr tokens in `theme.css`. Document intentional interface exceptions in `docs/app-stylr-exceptions.md`.
- Keep `manifest.json` and `package.json` versions aligned.
- Include the problem, resulting behavior, validation evidence, and remaining limitations in a pull request.

The [architecture guide](docs/architecture.md) describes runtime ownership. The [release checklist](docs/releasing.md) covers browser verification and GitHub downloads.

## Bug reports

Use the [issue tracker](https://github.com/kylbutlr/parity-scrollr/issues). Include browser and extension versions, reference type, settings, reproduction steps, expected result, and actual result. Sanitize URLs and captures before sharing.
