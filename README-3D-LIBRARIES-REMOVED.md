# Maya 2D-only version — optional 3D libraries removed

**Maya project identity:** TaNiM world

**Backup branch:** `backup/maya-before-3d-vendor-removal-2026-10-31`

On 2026-10-31, the project removed its bundled Three.js and pixiv three-vrm runtime files, including addon modules, from the working source.

- Original SVG 2D Maya remains available.
- 3D rendering, GLB/VRM loading, 3D lip sync, facial rig expressions, gaze, blinking in 3D, animation and hair physics are disabled. Their settings controls are explicitly disabled.
- Voice, Gemini chat, Memory Packs, and Android phone controls were not deliberately modified, but their successful performance still requires real device testing.
- `maya.vrm` was retained for possible restoration; ownership and redistribution rights of that asset remain unverified.
- APK construction still uses third-party Android/Capacitor/Gradle dependencies with their own licenses. The project owner does not automatically own those dependencies.
- Prior Git commits and the backup branch retain the original vendor code and its licenses. Do not redistribute those revisions without complying with their original notices.

To restore the 3D experience, compare this version with the backup branch, restore the necessary renderer and vendor files with correct legal notices, and run tests before deploying.

## Current rights statement

New original Maya material that TaNiM world has the legal right to license is covered by the repository's current **TaNiM world License — All Rights Reserved**. Earlier MIT-licensed copies retain previously granted permissions. Existing Android/Capacitor and other external dependencies remain under their own terms. This statement alone cannot certify exclusive rights to the `maya.vrm` avatar or images.
