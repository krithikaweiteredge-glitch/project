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
        The 3D models are built in code by the IVHM platform. The Hubble Space Telescope, Space Shuttle external tank and solid rocket boosters are from NASA 3D Resources (public domain; NASA does not endorse this site).</p>
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
