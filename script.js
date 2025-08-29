
// === Zero-maintenance auto-indexer (v2) =========================
// Now supports MP3s directly in assets/audio/ (shown as "Library")
// and subfolders (each folder = album).
// ================================================================
const GH_OWNER = "TheDogsDinnerMusic";
const GH_REPO  = "rogues-records-site";
const BRANCH   = "main";

const $ = s => document.querySelector(s);
const grid = document.querySelector('#albumsGrid');
const emptyState = document.querySelector('#emptyState');
const player = document.querySelector('#player');
const playPauseBtn = document.querySelector('#playPause');
const closePlayerBtn = document.querySelector('#closePlayer');
const trackTitle = document.querySelector('#trackTitle');
const progressBar = document.querySelector('#progressBar');
const audio = new Audio();

let currentTrack = null;

function toTitle(name){
  return name.replace(/[-_]+/g,' ').replace(/\b\w/g, m => m.toUpperCase()).trim();
}
function slug(s){
  return s.toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
}
async function ghList(path){
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${BRANCH}`;
  const r = await fetch(url, {headers:{'Accept':'application/vnd.github+json'}});
  if(!r.ok) return [];
  return r.json();
}
async function coverIfExists(folderName){
  const candidates = ['jpg','jpeg','png','webp','svg']
    .map(ext => `assets/artwork/${folderName}.${ext}`);
  for (const c of candidates){
    const res = await fetch(c, {method:'HEAD'});
    if (res.ok) return c;
  }
  return '';
}
async function buildLibrary(){
  document.querySelector('#year').textContent = new Date().getFullYear();
  try {
    const audioRoot = await ghList('assets/audio');
    if (!audioRoot.length){ emptyState.style.display='block'; return; }

    const albums = [];
    // 1) Root-level MP3s → "Library" album
    const rootTracks = audioRoot
      .filter(x => x.type === 'file' && /\.mp3$/i.test(x.name))
      .sort((a,b)=>a.name.localeCompare(b.name))
      .map(f => ({
        title: toTitle(f.name.replace(/\.\w+$/,'')),
        preview: `assets/audio/${encodeURIComponent(f.name)}`
      }));
    if (rootTracks.length){
      const cover = await coverIfExists('Library');
      albums.push({ id:'library', title:'Library', cover, tracks: rootTracks });
    }

    // 2) Each subfolder → its own album
    const dirs = audioRoot.filter(x => x.type === 'dir');
    for (const d of dirs){
      const folder = d.name;
      const files = await ghList(`assets/audio/${folder}`);
      const tracks = files
        .filter(f => f.type === 'file' && /\.mp3$/i.test(f.name))
        .sort((a,b) => a.name.localeCompare(b.name))
        .map(f => ({
          title: toTitle(f.name.replace(/\.\w+$/,'')),
          preview: `assets/audio/${encodeURIComponent(folder)}/${encodeURIComponent(f.name)}`
        }));
      if (!tracks.length) continue;
      const cover = await coverIfExists(folder);
      albums.push({ id: slug(folder), title: toTitle(folder), cover, tracks });
    }

    if (!albums.length){ emptyState.style.display='block'; return; }

    grid.innerHTML = albums.map(album => `
      <article class="card">
        <div class="cover">${album.cover ? `<img src="${album.cover}" alt="${album.title} cover">` : ''}
          <div class="badge"><div class="album-title">${album.title}</div></div>
        </div>
        <div class="card-body">
          <ul class="tracks">
            ${album.tracks.map(t => `
              <li class="track">
                <button class="play" data-src="${t.preview}" data-title="${album.title} — ${t.title}">►</button>
                <div class="track-title" title="${t.title}">${t.title}</div>
              </li>`).join('')}
          </ul>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.play').forEach(btn => {
      btn.addEventListener('click', () => {
        const src = btn.getAttribute('data-src');
        const title = btn.getAttribute('data-title');
        if (!src) return;
        playTrack(title, src);
      });
    });
  } catch (e){
    console.error(e);
    emptyState.style.display='block';
    emptyState.textContent = 'Could not load albums.';
  }
}
function playTrack(title, src){
  currentTrack = src;
  trackTitle.textContent = title;
  audio.src = src;
  audio.play().then(()=>{
    player.classList.remove('hidden');
    playPauseBtn.textContent = '❚❚';
  }).catch(e=>{
    console.error(e);
    alert('Playback failed.');
  });
}
function stop(){
  audio.pause(); audio.currentTime = 0;
  currentTrack = null; player.classList.add('hidden');
  progressBar.style.width='0%'; playPauseBtn.textContent='►';
}
playPauseBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  if (audio.paused) audio.play().then(()=> playPauseBtn.textContent='❚❚');
  else { audio.pause(); playPauseBtn.textContent='►'; }
});
closePlayerBtn.addEventListener('click', stop);
audio.addEventListener('timeupdate', () => {
  const pct = (audio.currentTime / (audio.duration||1))*100;
  progressBar.style.width = `${pct}%`;
});
audio.addEventListener('ended', stop);

buildLibrary();
