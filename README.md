# Sus Station: Orbital Edition

A reconstruction of your supplied browser game, retaining its five maps, roles, tasks, cosmetics, host-controlled rooms, replay flow and proximity voice implementation.

## Run / publish

Upload index.html and the css/, js/ and assets/ folders together to your existing static host. Preserve folder names. Use HTTPS for microphone access. This package does not deploy itself or create a public game URL.

For same-browser offline testing, serve the folder with a local HTTP server and open index.html?local=1. Create a room in one tab and join the room code in another tab. Local test mode uses BroadcastChannel and intentionally has no voice.

For normal online play, open index.html without local=1. PeerJS is loaded from an external CDN and signaling is external. Select a destination, enter your name, create a room, and share its invite link. Only the host can start. The practice shortcut adds five bots but still waits for you to press Start.

## Comfort and animation

Comfort mode is ON by default because of your earlier flicker / eye-strain feedback. It removes CSS animation, camera shake and cinematic postprocessing and reduces ambient glow. Turn it off from the home header or in-game menu for UI transitions and the floating character preview. Bloom remains a separate opt-in in the menu. Existing character walk cycles and environmental details remain in the canvas renderer.

## Important limitations

The host browser remains the server. Closing/reloading it ends the room. Reconnect recovery is best effort, not a guarantee that a mobile OS will keep a browser alive after switching apps. There is no dedicated server, host migration, durable room storage, or configured TURN relay. Real-device microphone and cross-network voice testing is still required. This is a trusted-friends prototype, not a public competitive service with strong authentication or anti-cheat.

## Files

- index.html: launch deck and game shell
- css/style.css: original foundation plus Orbital visual system
- js/polish.js: integrated UI, comfort, prop treatment and lifecycle enhancements
- js/boot.js: initialization after all enhancements load
- Remaining js files: retained game systems with targeted fixes
- assets/station-keyart.webp: original AI-generated launch artwork
- AUDIT_AND_CHANGES.md: file-by-file review, fixes and remaining risks
- tests/: browser automation and recorded results

Visual artwork was generated with Microsoft Copilot. The generated launch illustration is not a screenshot of the playable world. Gameplay remains the supplied Canvas 2.5D engine, not a replacement full-3D engine.
# SusStation_1
