import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ArrowRight, Camera, Check, Copy, ExternalLink, ImagePlus, QrCode, ShieldCheck, X } from 'lucide-react';
import { FreeQRFooter, InstallButton } from './SiteChrome.jsx';

export default function ScannerPage() {
 const videoRef=useRef(null),controlsRef=useRef(null),readerRef=useRef(null);
 const [scanning,setScanning]=useState(false),[result,setResult]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>()=>{try{controlsRef.current?.stop();readerRef.current?.reset();}catch{}},[]);
 const stopCamera=()=>{try{controlsRef.current?.stop();}catch{}setScanning(false);};
 const startCamera=async()=>{
  setError('');setResult('');
  if(!navigator.mediaDevices?.getUserMedia){setError('Camera access needs HTTPS and a supported browser.');return;}
  try{
   const reader=new BrowserMultiFormatReader();readerRef.current=reader;
   // Avoid listVideoInputDevices(): it is not available on every ZXing browser-reader version.
   // Ask for the rear-facing camera directly and let the browser choose a compatible device.
   const controls=await reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}},audio:false},videoRef.current,(decoded,_err,activeControls)=>{
    if(decoded){setResult(decoded.getText());setScanning(false);activeControls?.stop();}
   });
   controlsRef.current=controls;setScanning(true);
  }catch(e){setError(e?.message||'Could not start the camera. Check camera permission and try again.');setScanning(false);}
 };
 const scanImage=async file=>{
  if(!file)return;setBusy(true);setError('');setResult('');const url=URL.createObjectURL(file);
  try{const reader=new BrowserMultiFormatReader();const decoded=await reader.decodeFromImageUrl(url);setResult(decoded.getText());}
  catch{setError('No readable QR code found in that image. Try a sharper, well-lit image.');}
  finally{URL.revokeObjectURL(url);setBusy(false);}
 };
 const copyResult=async()=>{try{await navigator.clipboard.writeText(result);setError('Copied to clipboard.');}catch{setError('Clipboard access was blocked by your browser.');}};
 const isLink=/^https?:\/\//i.test(result);
 return <div className="app-shell scanner-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/>
  <header className="topbar"><a className="brand" href="/" aria-label="FreeQR home"><span className="brand-mark"><QrCode size={22}/></span><span>Free<span className="brand-light">QR</span><small>QR STUDIO</small></span></a><nav className="top-links"><a href="/create">Studio</a><a href="/scan" aria-current="page">QR Scanner</a></nav><div className="top-actions"><span className="free-pill"><span/> Free forever</span><InstallButton/></div></header>
  <main className="scanner-main"><a className="scanner-back" href="/"><ArrowRight size={15}/> Back to QR Studio</a>
   <div className="scanner-heading"><div className="eyebrow"><Camera size={14}/> PRIVATE, IN-BROWSER SCANNING</div><h1>Scan a QR.<br/><span>Reveal what’s inside.</span></h1><p>Use your camera or choose an image. Your scan stays on this device.</p></div>
   <div className="scanner-layout">
    <section className="scanner-card"><div className="scanner-card-head"><span className="panel-icon"><Camera size={18}/></span><div><b>Live camera</b><small>Point your camera at a QR code</small></div><span className={scanning?'scanner-live on':'scanner-live'}>{scanning?'SCANNING':'READY'}</span></div>
     <div className="camera-stage"><video ref={videoRef} muted playsInline className={scanning?'scanner-video visible':'scanner-video'}/><div className="scan-frame"><i/><i/><i/><i/></div>{!scanning&&!result&&<div className="camera-placeholder"><Camera size={32}/><span>Your camera preview appears here</span></div>}</div>
     <div className="scanner-actions">{scanning?<button className="download-button" onClick={stopCamera}>Stop camera <X size={15}/></button>:<button className="download-button" onClick={startCamera}><Camera size={15}/> Start scanning <ArrowRight size={15}/></button>}<label className="scan-upload-button"><ImagePlus size={15}/>{busy?'Reading image…':'Scan an image'}<input type="file" accept="image/*" disabled={busy} onChange={e=>{scanImage(e.target.files?.[0]);e.target.value='';}}/></label></div>
     <p className="scanner-permission-note"><ShieldCheck size={14}/> Camera permission is requested only when you press Start scanning.</p>
    </section>
    <section className="scanner-result-card"><div className="scanner-card-head"><span className="panel-icon"><QrCode size={18}/></span><div><b>Scan result</b><small>Decoded QR content</small></div></div>
     {result?<><div className="scan-result-type"><Check size={14}/> QR CODE DECODED</div><pre className="scan-result-text">{result}</pre><div className="scan-result-actions"><button className="outline-small" onClick={copyResult}><Copy size={14}/> Copy result</button>{isLink&&<a className="download-button scan-open-link" href={result} target="_blank" rel="noopener noreferrer">Open link <ExternalLink size={14}/></a>}</div></>:<div className="scan-empty"><span><QrCode size={25}/></span><b>Nothing scanned yet</b><p>Your decoded text, link, Wi-Fi payload, or contact data will appear here.</p></div>}
     {error&&<p className="scanner-message" role="status">{error}</p>}
    </section>
   </div><div className="scanner-privacy"><ShieldCheck size={16}/><span><b>Private by design.</b> Camera frames and uploaded images are decoded locally and are not uploaded to FreeQR.</span></div>
  </main><FreeQRFooter/>
 </div>;
}
