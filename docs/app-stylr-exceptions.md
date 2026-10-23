# App Stylr exceptions

This file records intentional differences from the pinned App Stylr v1.2.0 source release.

| Area | App Stylr default | Local requirement | Reason | Owner | Review trigger |
| --- | --- | --- | --- | --- | --- |
| Comparison toolbar and session controls | Standard controls are at least 40px tall | Dense comparison controls use a 26 to 32px height | The comparison chrome must preserve page area and horizontal room for viewport, synchronization, history, capture, and Help controls | Kyle | Comparison control density changes |

The 2.1.0 source candidate uses a wrapping, two-row toolbar and a native details disclosure for secondary navigation. Rendered comparison against the pinned guide is pending browser-tool availability.
