import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Download, Github, Linkedin, Mail, QrCode, Smartphone, X } from 'lucide-react';

function hslToHex(h, s = 72, l = 32) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}
function hexToHue(hex) {
  const v = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(v)) return 150;
  const [r,g,b] = [0,2,4].map(i => parseInt(v.slice(i,i+2),16)/255);
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  if (!d) return 150;
  const h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
  return Math.round((h*60+360)%360);
}
export function CustomColorControl({ label, value, onChange, presets }) {
  const [open,setOpen]=useState(false), [hex,setHex]=useState(value), [hue,setHue]=useState(()=>hexToHue(value));
  useEffect(()=>{setHex(value);setHue(hexToHue(value));},[value]);
  const updateHex=next=>{setHex(next);if(/^#[0-9a-f]{6}$/i.test(next)){onChange(next);setHue(hexToHue(next));}};
  return <div className="design-group custom-color-control">
    <div className="design-label-row"><span>{label}</span><span className="color-value">{value.toUpperCase()}</span></div>
    <button type="button" className="custom-color-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <span className="custom-color-chip" style={{background:value}}/><span className="custom-color-trigger-copy"><b>Choose a color</b><small>HEX value · curated palette</small></span><ChevronDown size={15} className={open?'picker-chevron open':'picker-chevron'}/>
    </button>
    {open&&<div className="custom-color-popover">
      <div className="custom-picker-top"><span>COLOR STUDIO</span><span className="picker-live-dot"/></div>
      <div className="custom-hex-row"><span className="custom-color-chip large" style={{background:/^#[0-9a-f]{6}$/i.test(hex)?hex:value}}/><label><small>HEX COLOR</small><input aria-label={label+' hex color'} value={hex} maxLength={7} spellCheck="false" onChange={e=>updateHex(e.target.value)} onBlur={()=>{if(!/^#[0-9a-f]{6}$/i.test(hex))setHex(value);}}/></label></div>
      <div className="hue-control"><div className="hue-heading"><span>Color spectrum</span><b>{hue}°</b></div><input aria-label={label+' hue'} type="range" min="0" max="359" value={hue} onChange={e=>{const h=Number(e.target.value),c=hslToHex(h);setHue(h);setHex(c);onChange(c);}}/></div>
      <div className="custom-palette-label">QUICK COLORS</div><div className="custom-palette">{presets.map(c=><button type="button" key={c} aria-label={'Choose '+c} title={c} className={value.toLowerCase()===c.toLowerCase()?'palette-swatch selected':'palette-swatch'} style={{background:c}} onClick={()=>{setHex(c);setHue(hexToHue(c));onChange(c);}}/>)}</div>
      <button type="button" className="picker-done" onClick={()=>setOpen(false)}>Done <Check size={14}/></button>
    </div>}
  </div>;
}

export function InstallButton() {
  const [promptEvent,setPromptEvent]=useState(null),[installed,setInstalled]=useState(false),[helpOpen,setHelpOpen]=useState(false),[appleMobile,setAppleMobile]=useState(false);
  useEffect(()=>{
    const ua=navigator.userAgent||'';
    setAppleMobile(/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
    setInstalled(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true);
    const onPrompt=e=>{e.preventDefault();setPromptEvent(e);},onInstalled=()=>{setInstalled(true);setPromptEvent(null);};
    window.addEventListener('beforeinstallprompt',onPrompt);window.addEventListener('appinstalled',onInstalled);
    return ()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);};
  },[]);
  if(installed)return null;
  const install=async()=>{if(promptEvent){await promptEvent.prompt();await promptEvent.userChoice;setPromptEvent(null);}else setHelpOpen(true);};
  return <>
    <button className="install-nav-button" type="button" onClick={install}><Download size={14}/><span>Install</span></button>
    {helpOpen&&<div className="install-help-backdrop" onClick={()=>setHelpOpen(false)}><section className="install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title" onClick={e=>e.stopPropagation()}>
      <button className="install-help-close" type="button" onClick={()=>setHelpOpen(false)} aria-label="Close install instructions"><X size={17}/></button><div className="install-help-icon"><Smartphone size={22}/></div><h2 id="install-help-title">Install FreeQR</h2>
      {appleMobile?<ol><li>Open this site in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> icon.</li><li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li></ol>:<ol><li>Open FreeQR in Chrome or a supported browser.</li><li>Open the browser menu.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li></ol>}
      <p>FreeQR opens like an app from your home screen. QR creation and scanning run locally in your browser.</p>
    </section></div>}
  </>;
}

export function FreeQRFooter() {
 return <footer className="site-footer freeqr-footer"><div className="footer-main">
  <div className="footer-brand"><div className="footer-brand-row"><img className="footer-favicon" src="/favicon.svg" alt="" aria-hidden="true"/><span className="footer-brand-name">Free<span>QR</span></span></div><p>Useful software.<br/>Without the nonsense.</p><div className="footer-status"><span className="status-dot"/>Building useful things</div>
   <div className="footer-socials"><a href="https://github.com/avada-kedavra62442/" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="GitHub" title="GitHub"><Github size={18}/></a><a href="mailto:aarav.krish62442@gmail.com" className="footer-social-link" aria-label="Email" title="Email"><Mail size={18}/></a><a href="https://www.linkedin.com/in/aarav-krish-665702440/" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="LinkedIn" title="LinkedIn"><Linkedin size={18}/></a></div>
  </div>
  <div className="footer-column"><span className="footer-heading">PRODUCTS</span><a href="#studio">FreeQR Studio</a><a href="/scan">QR Scanner</a></div>
  <div className="footer-column"><span className="footer-heading">TOOLS</span><a href="#studio">Create QR</a><a href="/scan">Scan QR</a><a href="#studio">Wi-Fi QR</a><a href="#studio">Contact QR</a><a href="#studio">URL QR</a></div>
  <div className="footer-column"><span className="footer-heading">MORE</span><a href="https://free-pdf-delta.vercel.app/" target="_blank" rel="noopener noreferrer">FreePDF</a><a href="mailto:aarav.krish62442@gmail.com?subject=FreeToolz%20Feedback">Send feedback</a><a href="mailto:aarav.krish62442@gmail.com?subject=FreeQR%20Privacy">Privacy &amp; contact</a></div>
 </div><div className="footer-bottom"><span>© {new Date().getFullYear()} FreeQR. All rights reserved.</span><span className="footer-line"/><span>BUILT FOR THE WEB · BUILT TO BE USEFUL</span></div></footer>;
}
