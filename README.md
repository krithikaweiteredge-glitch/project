# IVHM — 3D scroll story

A scroll-driven 3D showcase of how IVHM (Integrated Vehicle Health Management) works.
A real-time 3D drone splits into an exploded view as you scroll. Its parts float in space, and the camera flies into each one as its fault plays out:

| # | Section | What happens in 3D |
|---|---|---|
| 0 | Every part. Every flight. | Assembled drone floating over a grid |
| 1 | A model of every system | The skin splits apart, the systems float free, each one tagged **SAFE** |
| 2 | A misfire, caught mid-air | Engine opens up: pistons and crank turning, spark plugs firing; one cylinder's sparks go missing and it turns **CAUTION** |
| 3 | How far a part has worn | Datalink radio: radio rings from the antenna get shorter and redder; damage crosses the 1.0 limit and turns **NO-GO** |
| 4 | It knows when a sensor lies | Oil pump ringed green (**SAFE**), pressure sensor ringed dashed amber (**SENSOR ISSUE**) |
| 5 | How many flights are left | Remaining-life chart with its 90% range |
| 6 | One answer before every flight | Drone reassembles under red light; Ready-to-fly card says **NO-GO**, and the release is refused |
| 7 | Fix it. Every screen knows. | Hatch lifts, the old radio rises out, the new one drops in, green light |
| 8 | The whole fleet | Fleet board; UAV-01 flips to **GO** |
| 9 | Closing | — |

All aircraft, numbers and screens are **simulated**, for illustration only.

## Run it

Needs Node.js 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Build for hosting:

```bash
npm run build      # output in dist/
npm run preview    # serve the build locally
```

`dist/` is a static site and can go on any web server. Because the base path is relative (`./`), it also works from a sub-folder.

## Stack

- React 18 + Vite
- three.js through **@react-three/fiber**, **@react-three/drei** (ScrollControls, Html tags, Environment with Lightformers, useGLTF)
- **@react-three/postprocessing**: bloom, film grain, vignette
- Fonts bundled with **@fontsource** (Space Grotesk, JetBrains Mono)

Nothing loads from the internet at run time: no CDN, no remote fonts, no HDRI downloads. The sunset sky, the cloud sea and the lighting are all built in code (`src/scene/Sky.jsx`).

The aircraft is "MQ-1 Predator UAV" by Jeyhun1985 (Sketchfab, CC BY 4.0), in `public/models/predator/`. `src/scene/hull.js` cuts it into the pieces that fly apart.

## Where things are

```
src/
  store.js            scroll position (t, in sections) + the story's timeline (when each fault appears)
  App.jsx             Canvas, ScrollControls, overlay, loader
  scene/
    Scene.jsx         camera path (one shot per section), lights, bloom
    Sky.jsx           sunset sky + volumetric (ray-marched) cloud sea, drawn at half resolution
    hull.js           loads the aircraft model and cuts it into explodable pieces
    Drone.jsx         every part: assembled position + exploded offset, waves, radio swap
    Engine.jsx        boxer engine: pistons, rods, crank, spark timing, misfire
    Radio.jsx         datalink radio with heat-sink fins and status LEDs
    Label.jsx         HUD tags pinned to parts, camera-facing status rings
    geometry.js       fuselage slices, wings, tail, antenna
    materials.js      PBR materials
  ui/
    Overlay.jsx       the text sections, charts and cards
    Chrome.jsx        fixed nav, counter, progress rail, preloader
  styles.css
```

### Changing the story

- **Timing:** `src/store.js`. Every effect is a function of `t` (0 = first section, 9 = last), e.g. `radioDamage`, `misfire`, `explode`.
- **Camera:** `SHOTS` in `src/scene/Scene.jsx`, one `{ p: camera position, at: look-at point }` per section.
- **How far parts fly apart:** `PARTS[...].off` in `src/scene/Drone.jsx`.
- **Text:** `src/ui/Overlay.jsx`. Headline lines (`<L>`) slide up automatically when their section arrives.

### Swapping in a real 3D model

If you get a `.glb` of the aircraft, load it with drei's `useGLTF` in `Drone.jsx` and wrap each named mesh in a `<Part k="...">`. The explode, float and camera logic stays the same.
