const $=id=>document.getElementById(id);

let selectedFile=null;
let localUrl=null;
let castReady=false;
let connectedDeviceName=null;
let isDraggingTimeline=false;
let wasPlayingBeforeSeek=false;
let seekWatchdog=null;

const PLAY_ICON_SVG='<polygon points="6 4 20 12 6 20 6 4"/>';
const PAUSE_ICON_SVG='<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

function toast(msg){
  const t=$('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>t.classList.remove('show'),2800);
}

function fmtTime(sec){
  if(!Number.isFinite(sec)||sec<0)return'0:00';
  return Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0');
}

function setTimelineVisual(pct){
  const clamped=Math.max(0,Math.min(100,Number.isFinite(pct)?pct:0));
  $('timelineFill').style.width=clamped+'%';
  $('timelineThumb').style.left=clamped+'%';
  $('timelineUi').setAttribute('aria-valuenow',Math.round(clamped));
}

function applyVideoOrientationMode(){
  const v=$('preview');
  const box=$('videoBox');
  const vw=v.videoWidth||0;
  const vh=v.videoHeight||0;
  box.classList.remove('is-vertical-video','is-horizontal-video');
  if(vw>0&&vh>0){
    if(vh>vw){
      box.classList.add('is-vertical-video');
    }else{
      box.classList.add('is-horizontal-video');
    }
  }
}

function updateDimensions(){
  const v=$('preview');
  const box=$('videoBox');
  const natW=v.videoWidth||0;
  const natH=v.videoHeight||0;
  const boxW=Math.round(box.clientWidth)||0;
  applyVideoOrientationMode();
  if(natW>0){
    const shapeLabel=natH>natW?'Vertical':'Horizontal';
    $('boxWidthBadge').textContent=`Width: ${natW}px · ${shapeLabel}`;
    $('infoWidth').textContent=`${natW}px (Box ${boxW}px · ${shapeLabel})`;
  }else{
    $('boxWidthBadge').textContent='Width: --';
    $('infoWidth').textContent='--';
  }
}

function setControlsEnabled(enabled){
  $('skipBtn').disabled=!enabled;
  $('playBtn').disabled=!enabled;
  $('forwardBtn').disabled=!enabled;
  $('speedSelect').disabled=!enabled;
  $('fullscreenBtn').disabled=!enabled;
  $('deleteBtn').disabled=!enabled;
  $('castBtn').disabled=!enabled;
}

function safePlay(v){
  if(!v||!v.src)return;
  const p=v.play();
  if(p&&typeof p.catch==='function'){
    p.catch(()=>{});
  }
}

/* Safe seek that prevents stuck frames on local blob videos */
function seekToTime(targetSec,shouldResume){
  const v=$('preview');
  if(!v||!v.src||!Number.isFinite(v.duration)||v.duration<=0)return;
  const clamped=Math.max(0,Math.min(Math.max(0,v.duration-0.05),targetSec));
  clearTimeout(seekWatchdog);
  $('seekSpinner').classList.add('active');

  try{
    if(typeof v.fastSeek==='function'&&!shouldResume){
      v.fastSeek(clamped);
    }else{
      v.currentTime=clamped;
    }
  }catch(_){
    v.currentTime=clamped;
  }

  const pct=(clamped/v.duration)*100;
  setTimelineVisual(pct);
  $('timeRead').textContent=fmtTime(clamped)+' / '+fmtTime(v.duration);

  seekWatchdog=setTimeout(()=>{
    $('seekSpinner').classList.remove('active');
    if(shouldResume&&v.paused){
      safePlay(v);
    }
  },450);
}

/* Upload Video with Smooth Loading Progress & Reliable Ready State */
$('fileInput').onchange=e=>{
  const file=e.target.files[0];
  if(!file)return;
  if(!file.type.startsWith('video/'))return toast('Please choose a valid video file.');

  const prevUrl=localUrl;
  selectedFile=file;
  localUrl=URL.createObjectURL(file);

  $('uploadBox').style.display='none';
  $('emptyScreen').style.display='none';
  $('preview').style.display='none';
  $('seekSpinner').classList.remove('active');
  setTimelineVisual(0);

  const loader=$('uploadLoader');
  const bar=$('loaderBarFill');
  const label=$('loaderLabel');
  loader.classList.add('active');
  bar.style.width='0%';
  label.textContent='LOADING VIDEO... 0%';

  let progress=0;
  const loadTimer=setInterval(()=>{
    progress+=Math.floor(Math.random()*18)+14;
    if(progress>=100)progress=100;
    bar.style.width=progress+'%';
    label.textContent=`LOADING VIDEO... ${progress}%`;

    if(progress>=100){
      clearInterval(loadTimer);
      setTimeout(()=>{
        loader.classList.remove('active');
        const v=$('preview');
        v.preload='auto';
        v.src=localUrl;
        v.load();
        v.playbackRate=parseFloat($('speedSelect').value)||1;
        v.style.display='block';

        if(prevUrl&&prevUrl!==localUrl){
          setTimeout(()=>URL.revokeObjectURL(prevUrl),1000);
        }

        $('videoTitle').textContent=file.name;
        $('infoType').textContent=file.type||'video/*';
        setControlsEnabled(true);

        v.addEventListener('canplay',function onFirstCanPlay(){
          v.removeEventListener('canplay',onFirstCanPlay);
          safePlay(v);
        },{once:true});

        toast('Video ready.');
      },180);
    }
  },95);
};

$('preview').onloadedmetadata=()=>{
  updateDimensions();
  $('timeRead').textContent='0:00 / '+fmtTime($('preview').duration);
};

$('preview').onwaiting=()=>{$('seekSpinner').classList.add('active')};
$('preview').onplaying=()=>{
  clearTimeout(seekWatchdog);
  $('seekSpinner').classList.remove('active');
  $('playIcon').innerHTML=PAUSE_ICON_SVG;
};
$('preview').onseeked=()=>{
  clearTimeout(seekWatchdog);
  $('seekSpinner').classList.remove('active');
  const v=$('preview');
  if(wasPlayingBeforeSeek&&!isDraggingTimeline){
    wasPlayingBeforeSeek=false;
    safePlay(v);
  }
};

window.addEventListener('resize',()=>{
  if(selectedFile)updateDimensions();
});

if(screen.orientation&&screen.orientation.addEventListener){
  screen.orientation.addEventListener('change',()=>{
    if(selectedFile)applyVideoOrientationMode();
  });
}

$('playBtn').onclick=()=>{
  const v=$('preview');
  if(!v.src)return;
  if(v.paused){
    safePlay(v);
  }else{
    v.pause();
  }
};

$('preview').onplay=()=>{$('playIcon').innerHTML=PAUSE_ICON_SVG};
$('preview').onpause=()=>{$('playIcon').innerHTML=PLAY_ICON_SVG};

$('preview').ontimeupdate=()=>{
  if(isDraggingTimeline)return;
  const v=$('preview');
  if(v.duration&&Number.isFinite(v.duration)&&v.duration>0){
    const pct=(v.currentTime/v.duration)*100;
    setTimelineVisual(pct);
    $('timeRead').textContent=fmtTime(v.currentTime)+' / '+fmtTime(v.duration);
  }
};

/* Custom Timeline Pointer Scrubbing & Tap-to-Seek */
function pctFromClientX(clientX){
  const rect=$('timelineUi').getBoundingClientRect();
  if(!rect.width)return 0;
  return Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
}

$('timelineUi').addEventListener('pointerdown',e=>{
  const v=$('preview');
  if(!v.src||!Number.isFinite(v.duration)||v.duration<=0)return;
  e.preventDefault();
  $('timelineUi').setPointerCapture(e.pointerId);
  isDraggingTimeline=true;
  wasPlayingBeforeSeek=!v.paused;
  $('timelineUi').classList.add('dragging');
  if(!v.paused)v.pause();

  const ratio=pctFromClientX(e.clientX);
  setTimelineVisual(ratio*100);
  seekToTime(ratio*v.duration,false);
});

$('timelineUi').addEventListener('pointermove',e=>{
  if(!isDraggingTimeline)return;
  const v=$('preview');
  if(!Number.isFinite(v.duration)||v.duration<=0)return;
  const ratio=pctFromClientX(e.clientX);
  setTimelineVisual(ratio*100);
  seekToTime(ratio*v.duration,false);
});

function finishTimelineDrag(e){
  if(!isDraggingTimeline)return;
  isDraggingTimeline=false;
  $('timelineUi').classList.remove('dragging');
  const v=$('preview');
  if(e&&typeof e.clientX==='number'&&Number.isFinite(v.duration)&&v.duration>0){
    const ratio=pctFromClientX(e.clientX);
    seekToTime(ratio*v.duration,wasPlayingBeforeSeek);
  }else if(wasPlayingBeforeSeek){
    wasPlayingBeforeSeek=false;
    safePlay(v);
  }
}

$('timelineUi').addEventListener('pointerup',finishTimelineDrag);
$('timelineUi').addEventListener('pointercancel',finishTimelineDrag);

$('skipBtn').onclick=()=>{
  const v=$('preview');
  if(!v.src||!Number.isFinite(v.duration))return;
  const resume=!v.paused;
  seekToTime(v.currentTime-10,resume);
};

$('forwardBtn').onclick=()=>{
  const v=$('preview');
  if(!v.src||!Number.isFinite(v.duration))return;
  const resume=!v.paused;
  seekToTime(v.currentTime+10,resume);
};

$('speedSelect').onchange=e=>{
  const v=$('preview');
  if(v.src)v.playbackRate=parseFloat(e.target.value);
};

/* Orientation-Aware Full Screen Toggle */
$('fullscreenBtn').onclick=async()=>{
  const box=$('videoBox');
  const v=$('preview');
  if(!v.src)return;
  applyVideoOrientationMode();
  const isVertical=(v.videoHeight||0)>(v.videoWidth||0);

  try{
    if(document.fullscreenElement){
      if(screen.orientation&&screen.orientation.unlock){
        try{screen.orientation.unlock()}catch(_){}
      }
      await document.exitFullscreen();
    }else if(box.requestFullscreen){
      await box.requestFullscreen();
      if(screen.orientation&&screen.orientation.lock){
        try{
          await screen.orientation.lock(isVertical?'portrait':'landscape');
        }catch(_){}
      }
    }else if(v.webkitEnterFullscreen){
      v.webkitEnterFullscreen();
    }
  }catch(err){
    toast('Fullscreen unavailable.');
  }
};

document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement&&screen.orientation&&screen.orientation.unlock){
    try{screen.orientation.unlock()}catch(_){}
  }
  if(selectedFile)applyVideoOrientationMode();
});

/* Delete Video */
$('deleteBtn').onclick=()=>{
  const v=$('preview');
  clearTimeout(seekWatchdog);
  $('seekSpinner').classList.remove('active');
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  v.pause();
  v.removeAttribute('src');
  v.load();
  v.style.display='none';

  if(localUrl){
    URL.revokeObjectURL(localUrl);
    localUrl=null;
  }
  selectedFile=null;
  $('fileInput').value='';
  $('videoBox').classList.remove('is-vertical-video','is-horizontal-video');

  $('uploadBox').style.display='block';
  $('emptyScreen').style.display='block';

  $('videoTitle').textContent='No video selected';
  $('boxWidthBadge').textContent='Width: --';
  $('infoWidth').textContent='--';
  $('infoType').textContent='--';
  $('timeRead').textContent='0:00 / 0:00';
  setTimelineVisual(0);
  $('playIcon').innerHTML=PLAY_ICON_SVG;

  setControlsEnabled(false);
  toast('Video deleted.');
};

/* Connection UI Helper */
function setConnectionUI(isConnected,name){
  connectedDeviceName=isConnected?name:null;
  $('navStatus').textContent=isConnected?'Connected':'Not Connect';
  $('navStatus').classList.toggle('connected',isConnected);
  $('deviceName').textContent=isConnected?name:'Not Connect';
  $('deviceSub').textContent=isConnected?'Connected and ready to cast':'Search Cast or Bluetooth TV devices';
}

/* Google Cast Setup */
function syncCastState(){
  if(!castReady)return;
  const session=cast.framework.CastContext.getInstance().getCurrentSession();
  if(session){
    const name=session.getSessionObj().receiver.friendlyName||'Cast TV';
    setConnectionUI(true,name);
  }else if(!connectedDeviceName){
    setConnectionUI(false,null);
  }
}

window.__onGCastApiAvailable=isAvailable=>{
  if(!isAvailable)return;
  try{
    const ctx=cast.framework.CastContext.getInstance();
    ctx.setOptions({
      receiverApplicationId:chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy:chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });
    castReady=true;
    ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED,syncCastState);
    syncCastState();
  }catch(e){}
};

/* Popup Card + Browser Bluetooth Permission Search */
async function triggerBluetoothSearch(){
  const statusEl=$('popupStatusText');
  const subEl=$('popupSubText');
  const listEl=$('popupDeviceList');
  statusEl.textContent='Searching...';
  subEl.textContent='Requesting browser Bluetooth permission to search nearby devices...';

  if(!navigator.bluetooth){
    statusEl.textContent='Searching Cast Network...';
    subEl.textContent='Browser Bluetooth API is unavailable on this browser. Use Cast Session below to connect.';
    return;
  }

  try{
    const device=await navigator.bluetooth.requestDevice({
      acceptAllDevices:true
    });
    const devName=device.name||'Bluetooth TV Device';
    statusEl.textContent='Device Found';
    subEl.textContent='Tap the device below to connect.';

    const row=document.createElement('div');
    row.className='found-item';
    row.innerHTML=`<div>${devName}</div><span>CONNECT</span>`;
    row.onclick=()=>{
      setConnectionUI(true,devName);
      $('castPopup').classList.remove('open');
      toast('Connected to '+devName);
    };
    listEl.innerHTML='';
    listEl.appendChild(row);
  }catch(err){
    if(err&&err.name==='NotFoundError'){
      statusEl.textContent='Search Cancelled';
      subEl.textContent='No device selected. Tap Scan Bluetooth to search again or use Cast Session.';
    }else{
      statusEl.textContent='Bluetooth Permission Needed';
      subEl.textContent='Please allow Bluetooth access in your browser settings, or tap Cast Session.';
    }
  }
}

$('findCastBtn').onclick=()=>{
  $('popupDeviceList').innerHTML='';
  $('castPopup').classList.add('open');
  triggerBluetoothSearch();
};

$('retryScanBtn').onclick=()=>{
  triggerBluetoothSearch();
};

$('openGoogleCastBtn').onclick=()=>{
  if(castReady){
    cast.framework.CastContext.getInstance().requestSession().then(()=>{
      syncCastState();
      $('castPopup').classList.remove('open');
    }).catch(()=>{
      toast('No Google Cast receiver found.');
    });
  }else{
    toast('Google Cast SDK unavailable in this browser.');
  }
};

$('closePopupBtn').onclick=()=>{
  $('castPopup').classList.remove('open');
};

$('castPopup').onclick=e=>{
  if(e.target===$('castPopup'))$('castPopup').classList.remove('open');
};

$('castBtn').onclick=async()=>{
  if(!selectedFile||!localUrl)return toast('Select a video first.');
  if(!castReady)return toast('Connect a Google Cast session first.');
  const session=cast.framework.CastContext.getInstance().getCurrentSession();
  if(!session)return toast('Connect to your TV first.');
  try{
    const mediaInfo=new chrome.cast.media.MediaInfo(localUrl,selectedFile.type||'video/mp4');
    mediaInfo.metadata=new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title=selectedFile.name;
    const req=new chrome.cast.media.LoadRequest(mediaInfo);
    req.autoplay=true;
    await session.loadMedia(req);
    toast('Casting video to TV.');
  }catch(e){
    toast('Cast failed. TV requires a reachable stream URL.');
  }
};

$('disconnectBtn').onclick=()=>{
  const s=cast.framework?.CastContext?.getInstance().getCurrentSession();
  if(s)s.endSession(true);
  setConnectionUI(false,null);
  toast('Disconnected');
};

/* 7-Second Intro Screen */
window.addEventListener('load',()=>{
  setTimeout(()=>{
    $('introScreen')?.classList.add('hide');
  },7000);
});
