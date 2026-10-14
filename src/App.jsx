import { useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Camera } from 'lucide-react';
import ScannerPage from './ScannerPage.jsx';
import { CustomColorControl, InstallButton, FreeQRFooter, ThemeSelect } from './SiteChrome.jsx';
import {
  ArrowDownToLine, ArrowRight, Check, ChevronDown, CircleHelp, Code2, Copy,
  Download, ExternalLink, FileImage, Globe2, Heart, ImagePlus, Mail, MapPin,
  Menu, MessageSquare, Palette, Phone, QrCode, RotateCcw, ShieldCheck,
  Smartphone, Sparkles, Wifi, X
} from 'lucide-react';

const TYPES = [
  { id: 'url', label: 'Website URL', icon: Globe2, hint: 'Send anyone to a website or link.' },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi, hint: 'Let guests join your network instantly.' },
  { id: 'text', label: 'Plain text', icon: MessageSquare, hint: 'Share a note, message, or anything else.' },
  { id: 'email', label: 'Email', icon: Mail, hint: 'Open a pre-addressed email.' },
  { id: 'phone', label: 'Phone', icon: Phone, hint: 'Make calling one tap away.' },
  { id: 'sms', label: 'SMS', icon: Smartphone, hint: 'Open a text message with the details filled in.' },
  { id: 'contact', label: 'Contact card', icon: QrCode, hint: 'Share contact details as a vCard.' },
  { id: 'location', label: 'Location', icon: MapPin, hint: 'Point people to a place on the map.' },
  { id: 'calendar', label: 'Calendar event', icon: Check, hint: 'Share event details that can be added to a calendar.' },
];

const initialFields = {
  url: { url: 'https://example.com' },
  wifi: { network: '', password: '', encryption: 'WPA', hidden: false },
  text: { text: '' },
  email: { email: '', subject: '', body: '' },
  phone: { phone: '' },
  sms: { phone: '', message: '' },
  contact: { firstName: '', lastName: '', phone: '', email: '', organization: '', website: '' },
  location: { latitude: '', longitude: '', label: '' },
  calendar: { title: '', location: '', start: '', end: '', description: '' },
};

const escapeVCard = (value = '') => String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const clean = (value) => String(value ?? '').trim();

function makePayload(type, f) {
  switch (type) {
    case 'url': {
      const value = clean(f.url);
      if (!value) return '';
      return /^(https?:|mailto:|tel:)/i.test(value) ? value : 'https://' + value;
    }
    case 'wifi': {
      if (!clean(f.network)) return '';
      const esc = (v) => String(v ?? '').replace(/([\\;,:"])/g, '\\$1');
      const security = f.encryption || 'WPA';
      return 'WIFI:T:' + security + ';S:' + esc(f.network) + ';' + (security === 'nopass' ? '' : 'P:' + esc(f.password) + ';') + 'H:' + (f.hidden ? 'true' : 'false') + ';;';
    }
    case 'text': return clean(f.text);
    case 'email': {
      if (!clean(f.email)) return '';
      return 'mailto:' + clean(f.email) + '?subject=' + encodeURIComponent(f.subject || '') + '&body=' + encodeURIComponent(f.body || '');
    }
    case 'phone': return clean(f.phone) ? 'tel:' + clean(f.phone).replace(/\s/g, '') : '';
    case 'sms': return clean(f.phone) ? 'SMSTO:' + clean(f.phone).replace(/\s/g, '') + ':' + (f.message || '') : '';
    case 'contact': {
      if (!clean(f.firstName) && !clean(f.lastName) && !clean(f.phone) && !clean(f.email)) return '';
      const fullName = [clean(f.firstName), clean(f.lastName)].filter(Boolean).join(' ');
      return ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + escapeVCard(f.lastName) + ';' + escapeVCard(f.firstName) + ';;;', 'FN:' + escapeVCard(fullName), f.organization ? 'ORG:' + escapeVCard(f.organization) : '', f.phone ? 'TEL;TYPE=CELL:' + escapeVCard(f.phone) : '', f.email ? 'EMAIL:' + escapeVCard(f.email) : '', f.website ? 'URL:' + escapeVCard(f.website) : '', 'END:VCARD'].filter(Boolean).join('\n');
    }
    case 'location': {
      if (f.latitude === '' || f.longitude === '' || !Number.isFinite(Number(f.latitude)) || !Number.isFinite(Number(f.longitude)) || Number(f.latitude) < -90 || Number(f.latitude) > 90 || Number(f.longitude) < -180 || Number(f.longitude) > 180) return '';
      return 'geo:' + Number(f.latitude) + ',' + Number(f.longitude) + (clean(f.label) ? '?q=' + encodeURIComponent(f.label) : '');
    }
    case 'calendar': {
      if (!clean(f.title) || !clean(f.start)) return '';
      const toICS = (v) => v ? new Date(v).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z') : '';
      const esc = (v = '') => String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
      return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FreeQR//QR Event//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:' + (globalThis.crypto?.randomUUID?.() || (Date.now() + '@freeqr.local')), 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'), 'SUMMARY:' + esc(f.title), 'DTSTART:' + toICS(f.start), f.end ? 'DTEND:' + toICS(f.end) : '', f.location ? 'LOCATION:' + esc(f.location) : '', f.description ? 'DESCRIPTION:' + esc(f.description) : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    }
    default: return '';
  }
}

function Field({ label, children, hint }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

function Input({ value, onChange, placeholder, type = 'text', ...props }) {
  return <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} {...props} />;
}

export default function App() {
  const [type, setType] = useState('url');
  const [fields, setFields] = useState(initialFields);
  const [tab, setTab] = useState('content');
  const [foreground, setForeground] = useState('#123e2e');
  const [background, setBackground] = useState('#ffffff');
  const [transparent, setTransparent] = useState(false);
  const [dotStyle, setDotStyle] = useState('rounded');
  const [cornerStyle, setCornerStyle] = useState('extra-rounded');
  const [errorLevel, setErrorLevel] = useState('Q');
  const [size, setSize] = useState(640);
  const [frame, setFrame] = useState('none');
  const [frameText, setFrameText] = useState('SCAN ME');
  const [logo, setLogo] = useState('');
  const [logoSize, setLogoSize] = useState(0.24);
  const [downloadFormat, setDownloadFormat] = useState('png');
  const [notice, setNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const qrHost = useRef(null);
  const qrInstance = useRef(null);
  const logoInput = useRef(null);

  const currentType = TYPES.find((item) => item.id === type) || TYPES[0];
  const payload = useMemo(() => {
    try { return makePayload(type, fields[type] || {}); }
    catch { return ''; }
  }, [type, fields]);

  const updateField = (key, value) => setFields((prev) => ({ ...prev, [type]: { ...prev[type], [key]: value } }));

  const qrOptions = useMemo(() => ({
    width: size,
    height: size,
    type: 'svg',
    data: payload || 'https://example.com',
    margin: 32,
    qrOptions: { errorCorrectionLevel: logo ? 'H' : errorLevel },
    dotsOptions: { color: foreground, type: dotStyle },
    backgroundOptions: { color: transparent ? 'rgba(255,255,255,0)' : background },
    cornersSquareOptions: { color: foreground, type: cornerStyle },
    cornersDotOptions: { color: foreground, type: cornerStyle === 'dot' ? 'dot' : 'square' },
    image: logo || undefined,
    imageOptions: { crossOrigin: 'anonymous', margin: 5, imageSize: logoSize, hideBackgroundDots: true },
  }), [size, payload, errorLevel, foreground, background, transparent, dotStyle, cornerStyle, logo, logoSize]);

  useEffect(() => {
    if (!qrHost.current) return;
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling(qrOptions);
      qrHost.current.innerHTML = '';
      qrInstance.current.append(qrHost.current);
    } else {
      qrInstance.current.update(qrOptions);
    }
  }, [qrOptions]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const setTypeAndClose = (id) => {
    setType(id);
    setMobileMenu(false);
    setTab('content');
  };

  const onLogo = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNotice('Choose an image file for your logo.'); return; }
    if (file.size > 5 * 1024 * 1024) { setNotice('Logo must be smaller than 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setLogo(String(reader.result || '')); setErrorLevel('H'); };
    reader.readAsDataURL(file);
  };

  const download = async (format = downloadFormat) => {
    if (!payload) { setNotice('Add the required details first to create your QR code.'); return; }
    try {
      const blob = await qrInstance.current.getRawData(format);
      if (!blob) throw new Error('Could not export this format.');
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'freeqr-code.' + format;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1200);
      setNotice('Your QR code is ready to download.');
    } catch (error) {
      setNotice(error?.message || 'Export failed. Please try again.');
    }
  };

  const copyPayload = async () => {
    if (!payload) { setNotice('Add the required details first.'); return; }
    try { await navigator.clipboard.writeText(payload); setNotice('QR content copied.'); }
    catch { setNotice('Your browser did not allow copying.'); }
  };

  const resetDesign = () => {
    setForeground('#123e2e'); setBackground('#ffffff'); setTransparent(false);
    setDotStyle('rounded'); setCornerStyle('extra-rounded'); setErrorLevel('Q');
    setSize(640); setFrame('none'); setFrameText('SCAN ME'); setLogo(''); setLogoSize(0.24);
    setNotice('Design reset.');
  };

  const renderFields = () => {
    const f = fields[type];
    switch (type) {
      case 'url': return <Field label="Website address" hint="Include any page, form, social profile, or link."><Input value={f.url} onChange={(v) => updateField('url', v)} placeholder="https://yourwebsite.com" type="url" /></Field>;
      case 'wifi': return <><Field label="Network name (SSID)"><Input value={f.network} onChange={(v) => updateField('network', v)} placeholder="Your Wi-Fi name" autoComplete="off" /></Field><Field label="Password"><Input value={f.password} onChange={(v) => updateField('password', v)} placeholder="Wi-Fi password" type="text" autoComplete="off" /></Field><Field label="Security"><ThemeSelect value={f.encryption} onChange={v => updateField('encryption', v)} ariaLabel="Wi-Fi security" options={[{value:'WPA',label:'WPA / WPA2 / WPA3'},{value:'WEP',label:'WEP'},{value:'nopass',label:'No password'}]} /></Field><label className="check-field"><input type="checkbox" checked={f.hidden} onChange={(e) => updateField('hidden', e.target.checked)} /> Hidden network</label></>;
      case 'text': return <Field label="Your message"><textarea rows="5" value={f.text} onChange={(v) => updateField('text', v)} placeholder="Type something worth sharing…" /></Field>;
      case 'email': return <><Field label="Recipient email"><Input value={f.email} onChange={(v) => updateField('email', v)} placeholder="hello@example.com" type="email" /></Field><Field label="Subject (optional)"><Input value={f.subject} onChange={(v) => updateField('subject', v)} placeholder="Let's talk" /></Field><Field label="Message (optional)"><textarea rows="3" value={f.body} onChange={(v) => updateField('body', v)} placeholder="Write a message…" /></Field></>;
      case 'phone': return <Field label="Phone number"><Input value={f.phone} onChange={(v) => updateField('phone', v)} placeholder="+1 555 123 4567" type="tel" /></Field>;
      case 'sms': return <><Field label="Phone number"><Input value={f.phone} onChange={(v) => updateField('phone', v)} placeholder="+1 555 123 4567" type="tel" /></Field><Field label="Message (optional)"><textarea rows="3" value={f.message} onChange={(v) => updateField('message', v)} placeholder="Hey! Just checking in…" /></Field></>;
      case 'contact': return <><div className="field-grid"><Field label="First name"><Input value={f.firstName} onChange={(v) => updateField('firstName', v)} placeholder="First name" /></Field><Field label="Last name"><Input value={f.lastName} onChange={(v) => updateField('lastName', v)} placeholder="Last name" /></Field></div><Field label="Phone"><Input value={f.phone} onChange={(v) => updateField('phone', v)} placeholder="+1 555 123 4567" type="tel" /></Field><Field label="Email"><Input value={f.email} onChange={(v) => updateField('email', v)} placeholder="hello@example.com" type="email" /></Field><Field label="Organization (optional)"><Input value={f.organization} onChange={(v) => updateField('organization', v)} placeholder="Company or organization" /></Field><Field label="Website (optional)"><Input value={f.website} onChange={(v) => updateField('website', v)} placeholder="https://…" /></Field></>;
      case 'location': return <><Field label="Place name (optional)"><Input value={f.label} onChange={(v) => updateField('label', v)} placeholder="Central Park, New York" /></Field><div className="field-grid"><Field label="Latitude"><Input value={f.latitude} onChange={(v) => updateField('latitude', v)} placeholder="40.785091" type="number" step="any" /></Field><Field label="Longitude"><Input value={f.longitude} onChange={(v) => updateField('longitude', v)} placeholder="-73.968285" type="number" step="any" /></Field></div><a className="subtle-link" href="https://www.google.com/maps" target="_blank" rel="noreferrer">Find coordinates in Google Maps <ExternalLink size={13} /></a></>;
      case 'calendar': return <><Field label="Event title"><Input value={f.title} onChange={(v) => updateField('title', v)} placeholder="Team meeting" /></Field><div className="field-grid"><Field label="Starts"><Input value={f.start} onChange={(v) => updateField('start', v)} type="datetime-local" /></Field><Field label="Ends (optional)"><Input value={f.end} onChange={(v) => updateField('end', v)} type="datetime-local" /></Field></div><Field label="Location (optional)"><Input value={f.location} onChange={(v) => updateField('location', v)} placeholder="Meeting room or address" /></Field><Field label="Description (optional)"><textarea rows="3" value={f.description} onChange={(v) => updateField('description', v)} placeholder="What is the event about?" /></Field></>;
      default: return null;
    }
  };

  if (window.location.pathname === '/scan') return <ScannerPage />;

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="FreeQR home"><span className="brand-mark"><QrCode size={22} strokeWidth={2.3} /></span><span>Free<span className="brand-light">QR</span><small>QR STUDIO</small></span></a>
        <nav className="top-links"><a href="#studio">Studio</a><a href="/scan">QR Scanner</a><a href="#how">How it works</a><a href="#promise">Our promise</a></nav>
        <div className="top-actions"><span className="free-pill"><span /> Free forever</span><a className="scan-nav-button" href="/scan"><Camera size={14}/><span>Scan</span></a><InstallButton/><button className="mobile-menu" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><Menu size={20} /></button><a className="header-cta" href="#studio">Create a QR <ArrowRight size={15} /></a></div>
      </header>
      {mobileMenu && <div className="mobile-nav"><a onClick={() => setMobileMenu(false)} href="#studio">Studio</a><a onClick={() => setMobileMenu(false)} href="/scan">QR Scanner</a><a onClick={() => setMobileMenu(false)} href="#how">How it works</a><a onClick={() => setMobileMenu(false)} href="#promise">Our promise</a></div>}

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={13} /> YOUR IDEAS. ONE SCAN AWAY.</div>
            <h1>Make it scannable.<br /><span>Make it yours.</span></h1>
            <p className="hero-description">Beautiful QR codes for whatever you want to share. Designed your way, ready in seconds, and always free.</p>
            <div className="hero-buttons"><a href="#studio" className="primary-button">Create your QR <ArrowRight size={17} /></a><a href="#how" className="text-button">See how it works <ArrowDownToLine size={15} /></a></div>
            <div className="trust-row"><span><Check size={14} /> No account</span><span><Check size={14} /> No watermark</span><span><Check size={14} /> No premium lock</span></div>
          </div>
          <div className="hero-art" aria-label="Decorative QR code preview">
            <div className="orbit orbit-a" /><div className="orbit orbit-b" />
            <div className="floating-tag tag-top"><span className="tag-dot" /> SCAN. CONNECT. GO.</div>
            <div className="hero-qr-card"><div className="hero-qr-top"><span className="mini-mark"><QrCode size={15} /></span><span>FREEQR <b>STUDIO</b></span><span className="live-dot" /></div><div className="hero-qr"><div className="hero-qr-inner"><QrCode size={166} strokeWidth={1.8} /></div><span className="hero-center-mark"><QrCode size={22} /></span></div><div className="hero-qr-bottom"><span>YOUR NEXT BIG THING</span><span className="qr-spark">✳</span></div></div>
            <div className="floating-tag tag-bottom"><Palette size={14} /> MADE TO MATCH YOU</div>
          </div>
        </section>

        <section className="type-strip" aria-label="QR code types">{TYPES.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTypeAndClose(item.id); document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' }); }} className={type === item.id ? 'type-chip selected' : 'type-chip'}><Icon size={16} /><span>{item.label}</span></button>; })}</section>

        <section className="studio-section" id="studio">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE CREATION STUDIO</div><h2>Your QR. Your rules.</h2><p>Build it, style it, download it. That's the whole deal.</p></div><div className="studio-status"><span className="status-dot" /> LIVE PREVIEW</div></div>
          <div className="studio-layout">
            <aside className="editor-panel">
              <div className="panel-top"><div className="panel-title"><span className="panel-icon"><Code2 size={17} /></span><div><strong>QR builder</strong><small>Make something useful</small></div></div><span className="step-label">01 <i>/</i> 02</span></div>
              <div className="editor-tabs"><button className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}>Content</button><button className={tab === 'design' ? 'active' : ''} onClick={() => setTab('design')}>Design <span className="tab-spark">✳</span></button></div>
              {tab === 'content' ? <div className="editor-content">
                <div className="input-section-title">WHAT ARE WE SHARING?<span>01</span></div>
                <div className="type-select-grid">{TYPES.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setType(item.id)} className={type === item.id ? 'type-select active' : 'type-select'}><Icon size={16} /><span>{item.label}</span></button>; })}</div>
                <div className="selected-type-heading"><div className="selected-type-icon"><currentType.icon size={18} /></div><div><strong>{currentType.label}</strong><span>{currentType.hint}</span></div></div>
                <div className="dynamic-fields">{renderFields()}</div>
                <div className="privacy-note"><ShieldCheck size={16} /><span><b>Your content stays yours.</b> QR codes are generated in your browser.</span></div>
              </div> : <div className="editor-content design-content">
                <div className="input-section-title">PERSONALIZE YOUR CODE<span>02</span></div>
                <CustomColorControl label="QR color" value={foreground} onChange={setForeground} presets={['#123e2e','#0b2119','#111827','#3b5ccc','#7c3aed','#be3455','#0f766e','#f59e0b']} />
                <div className="design-group"><CustomColorControl label="Background" value={background} onChange={v => { setBackground(v); setTransparent(false); }} presets={['#ffffff','#f4f7f5','#e8f0eb','#dbeafe','#fff7ed','#f3e8ff']} /><button className={transparent ? 'toggle-chip on' : 'toggle-chip'} onClick={() => setTransparent(!transparent)}><span /> Transparent background</button></div>
                <div className="design-group"><span className="design-label">Dot style</span><div className="option-grid three">{[{v:'square',l:'Square'},{v:'dots',l:'Dots'},{v:'rounded',l:'Rounded'},{v:'classy',l:'Classy'},{v:'classy-rounded',l:'Soft classy'},{v:'extra-rounded',l:'Extra round'}].map(o => <button key={o.v} className={dotStyle === o.v ? 'option-button active' : 'option-button'} onClick={() => setDotStyle(o.v)}><span className={'dot-demo demo-'+o.v} />{o.l}</button>)}</div></div>
                <div className="design-group"><span className="design-label">Corner style</span><div className="option-grid three">{[{v:'square',l:'Square'},{v:'dot',l:'Dot'},{v:'extra-rounded',l:'Rounded'}].map(o => <button key={o.v} className={cornerStyle === o.v ? 'option-button active' : 'option-button'} onClick={() => setCornerStyle(o.v)}><span className={'corner-demo corner-'+o.v} />{o.l}</button>)}</div></div>
                <div className="design-group"><div className="design-label-row"><span>Error correction</span><span className="color-value">{errorLevel}</span></div><div className="option-grid four">{[{v:'L',l:'Low'},{v:'M',l:'Medium'},{v:'Q',l:'Quartile'},{v:'H',l:'High'}].map(o => <button key={o.v} className={errorLevel === o.v ? 'option-button active' : 'option-button'} onClick={() => setErrorLevel(o.v)}><b>{o.v}</b>{o.l}</button>)}</div><p className="micro-hint">Higher correction can help the code scan with a logo, but makes the pattern denser.</p></div>
                <div className="design-group"><div className="design-label-row"><span>Output size</span><span className="color-value">{size} × {size}px</span></div><input className="range-input" type="range" min="256" max="1200" step="32" value={size} onChange={(e) => setSize(Number(e.target.value))} /><div className="range-labels"><span>256px</span><span>1200px</span></div></div>
                <div className="design-group"><span className="design-label">Add a logo</span><input ref={logoInput} className="hidden-input" type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} /><div className="logo-upload-row">{logo ? <img src={logo} alt="Selected logo" className="logo-thumb" /> : <span className="logo-placeholder"><ImagePlus size={19} /></span>}<div className="logo-copy"><b>{logo ? 'Logo added' : 'Put your mark in the middle'}</b><span>PNG, JPG, or SVG · max 5 MB</span></div><button className="outline-small" onClick={() => logoInput.current?.click()}>{logo ? 'Change' : 'Upload'}</button>{logo && <button className="icon-small" aria-label="Remove logo" onClick={() => setLogo('')}><X size={15} /></button>}</div>{logo && <><div className="design-label-row logo-size-row"><span>Logo size</span><span className="color-value">{Math.round(logoSize*100)}%</span></div><input className="range-input" type="range" min="0.12" max="0.34" step="0.01" value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} /></>}</div>
                <div className="design-group"><span className="design-label">Frame</span><div className="option-grid two">{[{v:'none',l:'No frame'},{v:'label',l:'Scan me'},{v:'outline',l:'Outline'},{v:'bottom',l:'Bottom label'}].map(o => <button key={o.v} className={frame === o.v ? 'option-button active' : 'option-button'} onClick={() => setFrame(o.v)}>{o.l}</button>)}</div>{frame !== 'none' && <Field label="Frame text"><Input value={frameText} onChange={setFrameText} placeholder="SCAN ME" /></Field>}</div>
                <button className="reset-button" onClick={resetDesign}><RotateCcw size={14} /> Reset design</button>
              </div>}
              <div className="editor-footer"><span><ShieldCheck size={14} /> Private by design</span><span>NO ACCOUNT NEEDED</span></div>
            </aside>

            <div className="preview-column">
              <div className="preview-card">
                <div className="preview-header"><div><span className="preview-kicker">YOUR CREATION</span><h3>Looking good.</h3></div><span className="preview-live"><span /> LIVE</span></div>
                <div className="preview-stage">
                  <div className={'qr-output-frame frame-'+frame}>
                    {frame === 'label' && <div className="frame-top-label">{frameText || 'SCAN ME'}</div>}
                    <div className="qr-render" ref={qrHost} />
                    {(frame === 'bottom' || frame === 'outline') && <div className="frame-bottom-label">{frameText || 'SCAN ME'}</div>}
                  </div>
                  {!payload && <div className="preview-empty"><span><Sparkles size={15} /></span><p>Your QR code is waiting.</p><small>Fill in the details to bring it to life.</small></div>}
                </div>
                <div className="preview-meta"><div><span className="meta-label">TYPE</span><b>{currentType.label}</b></div><div><span className="meta-label">ERROR CORRECTION</span><b>{logo ? 'H · High (logo-safe)' : `${errorLevel} · ${{L:'Low',M:'Medium',Q:'Quartile',H:'High'}[errorLevel]}`}</b></div><div><span className="meta-label">SIZE</span><b>{size}px</b></div></div>
                <div className="download-area"><div className="download-title"><div><Download size={17} /><b>Take it with you.</b></div><span>READY WHEN YOU ARE</span></div><div className="download-controls"><div className="format-select"><FileImage size={16} /><ThemeSelect value={downloadFormat} onChange={setDownloadFormat} ariaLabel="Download format" options={[{value:'png',label:'PNG image'},{value:'svg',label:'SVG vector'},{value:'jpeg',label:'JPEG image'},{value:'webp',label:'WebP image'}]} /><ChevronDown size={13} /></div><button className="download-button" onClick={() => download()} disabled={!payload}><Download size={16} /> Download QR <ArrowRight size={15} /></button></div><button className="copy-content" onClick={copyPayload} disabled={!payload}><Copy size={13} /> Copy encoded content</button></div>
              </div>
              <div className="preview-footnote"><ShieldCheck size={16} /><span><b>Made in your browser.</b> Your content isn't sent to a server. Ever.</span><span className="footnote-spark">✳</span></div>
            </div>
          </div>
        </section>

        <section className="promise-section" id="promise"><div className="promise-heading"><div className="eyebrow"><span className="eyebrow-line" /> THE FREEQR PROMISE</div><h2>Free means <span>free.</span></h2><p>Not free until you need the good stuff. Just free.</p></div><div className="promise-grid"><article><span className="promise-icon"><Heart size={19} /></span><h3>No account. Ever.</h3><p>No sign-up walls, no email gate, no hoops to jump through. Open the studio and get going.</p></article><article><span className="promise-icon"><ShieldCheck size={19} /></span><h3>No watermark. Ever.</h3><p>Your QR code belongs to you. We won't stamp our name on your work or clutter your design.</p></article><article><span className="promise-icon"><Sparkles size={19} /></span><h3>No premium QR.</h3><p>Every customization is here from the start. No surprise paywall after you've designed it.</p></article></div></section>
        <section className="how-section" id="how"><div><div className="eyebrow"><span className="eyebrow-line" /> THREE STEPS. THAT'S IT.</div><h2>From idea to <span>scan-ready.</span></h2></div><div className="how-steps"><article><span>01</span><h3>Choose what to share</h3><p>A link, Wi-Fi password, contact card, event, or anything in between.</p></article><article><span>02</span><h3>Make it yours</h3><p>Pick your colors, shape, logo, frame, and size. Watch the preview update live.</p></article><article><span>03</span><h3>Download. Done.</h3><p>Export your code and use it on cards, posters, packaging, or anywhere.</p></article></div></section>
      </main>
      <FreeQRFooter />
      {notice && <div className="toast" role="status"><Check size={16} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}
    </div>
  );
}
