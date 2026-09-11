## App Stylr

This app follows [App Stylr v1.0.0](https://github.com/kylbutlr/app-stylr/tree/v1.0.0).

### Required visual review

Before implementing or reviewing interface work:

1. Open the rendered [App Stylr Visual Reference and Style Guide](https://app-stylr.netlify.app/).
2. Review the relevant hierarchy, typography, spacing, controls, states, responsive behavior, accessibility, and product voice before making UI decisions.
3. Implement with the pinned App Stylr tokens and adapters. Do not sample or approximate values from screenshots.
4. Compare the rendered app against both guides at the relevant viewports and interaction states before considering the interface complete.
5. Record every intentional difference in `docs/app-stylr-exceptions.md`.

The rendered guides show current App Stylr guidance. The pinned release remains this app's implementation source of truth. If current guidance requires a newer release, upgrade the pin deliberately before adopting it. Do not silently mix versions.

- Use App Stylr semantic tokens instead of copying raw palette colors.
- Treat App Stylr typography, spacing, radius, motion, accessibility, icon, content, and naming rules as defaults.
- Start personal productivity and utility apps with the dark theme unless a product requirement calls for another appearance.
- Keep the pinned App Stylr version explicit. Do not silently follow a moving `main` branch.
- Record intentional differences in `docs/app-stylr-exceptions.md` using the App Stylr exception template.
- When App Stylr and a documented product requirement conflict, follow the product requirement and record the exception.

## Consumer implementation

- `app-stylr.json` records the release pin and default theme.
- `theme.css` owns shared semantic tokens and bundled Geist typography.
- `popup.css` and `compare.css` consume those semantic tokens and should not define a second palette.
- Run `node --test` and the standalone scripts in `test/` after visual or branding changes.
