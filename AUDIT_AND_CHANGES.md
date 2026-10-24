# Deep review and reconstruction

## Scope and approach

All 16 supplied files were read. The reconstruction preserves the gameplay architecture instead of replacing it with an unrelated visual mockup. The largest changes are the launch screen, UI design system, comfort behavior, world prop layering, lifecycle safety and targeted host validation.

## File-by-file review

### index.html
The original entry experience was a single compact centered form. Replaced with a cinematic launch deck, mission-control card, destination selection, help, comfort toggle and practice shortcut. Existing IDs and gameplay entry points are retained. Added dialog semantics, live status regions, input labels and icon-button labels. Removed the viewport zoom restriction. Added a separate boot script so enhancements load before initialization.

### style.css
The original theme used strong saturated gradients, repeated glows, thick shadows, circular action controls and many flashing/pulsing states. The new layer uses deep navy, mint and warm neutral accents, quieter borders, consistent radii, more deliberate spacing and a clear primary-action hierarchy. Reworked launch, HUD, lobby, wardrobe, settings, meetings, tasks and results. Added responsive layouts down to 320px, focus-visible styling and reduced-motion rules. The original CSS foundation is retained, with the redesign appended for traceability rather than a complete stylesheet cleanup.

### client.js
Retained snapshots, local prediction, interaction detection and role-aware visibility. Movement prediction now stops when a non-host has not received a recent snapshot, reducing stale movement accumulation during reconnect. This is not a new interpolation or reconciliation protocol.

### cosmetics.js
Retained the complete existing colors, hats, visors, outfits, pets and Canvas character drawing. Wardrobe presentation is redesigned around those assets. No claim that every cosmetic was newly modeled or individually play-tested.

### host.js
Added host-side line-of-sight validation for kills and body reports. Movement acceptance now checks intermediate points against collision and closed doors instead of only testing the final position. Added bounds, distance and living-player validation to critical-system hold messages. Start eligibility uses online players/bots, with excluded offline players treated as spectators. Reconnection increments the authoritative position sequence. Lobby offline retention is extended from the original 90 seconds to 900 seconds of host simulation time. This is not a wall-clock persistence guarantee during host suspension.

### main.js
Preserved room creation, joining, input, background-event handlers, adaptive rendering and the worker tick. Moved final initialization to boot.js so the visual enhancements wrap the actual functions before startup. Home rendering no longer draws ten floating actors behind the new artwork.

### maps.js
Retained all five playable maps and the lobby, task definitions, vents, consoles, sabotage locations, collision grids and visibility geometry. No map topology redesign was performed. All five map render paths were exercised, not every possible traversal or station location.

### net.js
Retained the original PeerJS and BroadcastChannel transports and retry logic. The redesign does not replace networking. Local simulated disconnect recovery and same-room replay were tested. There is still no configured TURN server, durable room service, host migration, or authentication redesign.

### postfx.js
Cinematic processing is opt-in by default. Removed chromatic separation and reduced bloom strength. Critical alarm grading is steady rather than sinusoidally pulsing. Comfort mode disables postprocessing. No measured claim about eliminating all device-specific shimmer.

### render.js
Preserved integer-aligned baked floor rendering. Props are now submitted to the depth-sorted world pass instead of being permanently baked underneath every actor. Low-resolution settings previews retain prop artwork. Added dimensional crate/table treatment and restrained equipment details through polish.js. Comfort mode reduces ambient glow and particles. Fixed the malformed reconnect label. Some world art remains procedural and intentionally reuses the supplied renderer.

### tasks.js
Retained the task mechanics. Wrapped task completion so it cannot fire after cleanup or complete twice. Added instructions for interaction-heavy tasks. Task and sabotage dialog close timers now check dialog identity before closing. All task types were mounted and cleaned up; that is not a full automated completion test of every mini-game.

### ui.js
Action buttons now have real disabled semantics and accessible labels. Lobby readiness counts online players/bots. Minimap backing size responds to height as well as width. New crew manifest and contextual mission hint complement the existing HUD. Modal focus trapping/restoration added. Replay remains host controlled and retains joined clients.

### util.js
Retained helpers and icons. Bounded the shade cache to prevent unbounded growth from generated color keys.

### voice.js
Retained the original media-call mesh and proximity gain model. Added incoming-call checks against roster peer identity and cleanup of audio graph nodes on explicit peer drop. Changed the nonzero keep-alive oscillator gain to zero. Audio workarounds must not be presented as guarantees against OS suspension. Actual microphone permission, iOS playback, cross-network voice and 15-player audio load were not validated here.

### world3d.js
Retained extruded walls, depth sorting and parallax backdrop. Disabled radial wall perspective deformation for a stable orthographic 2.5D projection. This is still Canvas pseudo-3D, not a new mesh-based 3D engine.

## New files

- polish.js: integrated UI behavior, map preselection, practice shortcut, comfort controls, task guards, prop details and voice cleanup.
- boot.js: final initialization after the complete script stack.
- station-keyart.webp: compressed AI-generated launch illustration, not gameplay footage.

## Verification

Recorded browser checks are included in tests/results.json and tests/extended-results.json. External HTTPS resources were blocked during these local tests, so the suite also exercised fallback fonts and the offline local transport. It did NOT validate the online PeerJS signaling/CDN or real WebRTC voice path.

Covered: home boot, five destination choices, help, wardrobe categories, practice bots, selected-map propagation, second-tab join, host-controlled start, simulated client drop, identity preservation, end-to-lobby replay, second-round start, five map render calls, all task mounts/cleanup, portrait/landscape control bounds, four human browser tabs, meeting cards, confirmed skip vote, isolated host validation, delayed task completion guard and home width checks at 320/390/844/1024/1920px. No uncaught JavaScript errors were observed in the recorded runs.

## Remaining engineering risks

1. Host lifetime: the host tab is the authoritative server and has no durable recovery. Reloading it still ends the room.
2. Mobile suspension: visibility handlers, retries and workers are recovery aids, not an OS background-execution contract. Keep the host game open.
3. Connectivity: STUN-only configuration may not connect across restrictive networks; TURN configuration remains optional and unfilled.
4. Security: player IDs and client-supplied positions are not a complete authentication/anti-cheat system. Task success is client reported. Use with trusted friends, not as a hardened public service.
5. Voice: real hardware, microphone permissions, Safari/iOS behavior and large-room mesh load require separate validation.
6. Coverage: map rendering and task mounting are not exhaustive gameplay, role-balance, performance, accessibility or device certification.
7. Graphics scope: the launch art is substantially richer, but playable world art remains a refined version of the existing 2.5D procedural engine. No full 3D conversion or replacement asset library is claimed.

## Design rationale

The redesign emphasizes a coherent launch experience and legible in-game hierarchy instead of simply increasing glow, particles and flashing. Motion is available, but comfort is the default because the supplied project and prior feedback made visual stability important. Core game mechanics and room behavior were preserved to avoid sacrificing playability for presentation.
