// Contact: a form that opens the visitor's email app with the message filled in (no server needed).
import { useState } from 'react';
import { CATEGORIES } from '../data';

// Set your organisation's address here before publishing.
export const CONTACT_EMAIL = 'contact@example.com';

export default function Contact() {
  const [f, setF] = useState({ name: '', org: '', email: '', platform: CATEGORIES[0].name, message: '' });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const body = `${f.message}\n\n— ${f.name}${f.org ? `, ${f.org}` : ''}\n${f.email}\nPlatform of interest: ${f.platform}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`IVHM enquiry: ${f.platform}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  return (
    <div className="page contact">
      <header className="page-head">
        <div className="eyebrow">Contact</div>
        <h1 className="pro-h">Talk to the IVHM team.</h1>
        <p className="pro-body">Tell us about your fleet: the aircraft, how many, and the data they record. We will come back with how IVHM would monitor it.</p>
      </header>
      <form className="contact-form" onSubmit={submit}>
        <label><span>Name</span><input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
        <label><span>Organisation</span><input value={f.org} onChange={set('org')} autoComplete="organization" /></label>
        <label><span>Work email</span><input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label><span>Platform</span>
          <select value={f.platform} onChange={set('platform')}>{CATEGORIES.map((c) => <option key={c.id}>{c.name}</option>)}<option>Other</option></select>
        </label>
        <label className="wide"><span>Message</span><textarea required rows={6} value={f.message} onChange={set('message')} /></label>
        <div className="wide contact-foot">
          <button className="btn solid" type="submit">Send message</button>
          {sent && <span className="muted">Your email app should open with the message ready to send.</span>}
        </div>
      </form>
    </div>
  );
}
