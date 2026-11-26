import { COMPONENT_PHOTOS, VEHICLES } from '../data';

const Row = ({ kind, m }) => m?.file ? (
  <li>
    <span className="k">{kind}</span>
    <a href={m.page || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(m.file)}`} target="_blank" rel="noreferrer">{m.file.replace(/\.(webm|ogv|jpe?g|png)$/i, '').replace(/_/g, ' ')}</a>
    <span className="muted">{m.artist || 'Unknown author'} · {m.lic || 'see file page'}</span>
  </li>
) : null;

export default function Credits() {
  return (
    <div className="credits">
      <div className="eyebrow">Credits</div>
      <h1>Photos <span className="serif">&amp; videos</span></h1>
      <p className="lede">All media on this site comes from Wikimedia Commons and is used under the licence shown; click a title for the file page with full attribution.
        The 3D models are built in code by the IVHM platform, except these real models: the Su-30MKI, "Su-30 MKI loadout#1 [Brahmos]" by abhinab.das000 (Sketchfab, CC BY 4.0, https://sketchfab.com/3d-models/su-30-mki-loadout1-brahmos-e9b810ba081544d0997ad8cce4b95fc8), and the Tejas, "HAL Tejas" by dimal965 (Sketchfab, CC BY 4.0, https://sketchfab.com/3d-models/hal-tejas-fd95c85e2452490cbe32f80175498441; textures reduced in size for the web), the quadcopter, "Quadcopter DJI Matrice 300 RTK" by 19vitali99 (Sketchfab, CC BY 4.0, https://sketchfab.com/3d-models/quadcopter-dji-matrice-300-rtk-6677d02d66df4b73aad0d8e7bb9e3d9c; carry case removed and mesh simplified for the web), the airliner, "Air India A321 Exteriors + Interiors" by harshpriyanshu22 (Sketchfab, CC BY 4.0, https://sketchfab.com/3d-models/air-india-a321-exteriors-interiors-670c3985a1964a52a4c918bd45ef9e25; mesh simplified for the web), and the MALE UAV, "DRDO Rustom 2 UAV" by Priyajit Bera (Sketchfab, CC BY 4.0, https://sketchfab.com/3d-models/drdo-rustom-2-uav-6064f6b27edf47d4832e318c48c6a2ac; weapon pods removed and mesh simplified for the web). The Hubble Space Telescope, Space Shuttle external tank and solid rocket boosters are from NASA 3D Resources (public domain; NASA does not endorse this site).</p>
      <div className="credit-list">
        <div><h4>Component photographs</h4><ul>{Object.entries(COMPONENT_PHOTOS).map(([k, m]) => <Row key={k} kind={k.replace(/_/g, ' ').toUpperCase()} m={m} />)}</ul></div>
        {Object.values(VEHICLES).map((v) => (
          <div key={v.look}>
            <h4>{v.name}</h4>
            <ul><Row kind="VIDEO" m={v.media.video} /><Row kind="PHOTO" m={v.media.photo} /></ul>
          </div>
        ))}
      </div>
    </div>
  );
}
