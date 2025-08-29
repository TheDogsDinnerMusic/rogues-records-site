
// === Zero-maintenance auto-indexer ===============================
// It reads album folders and tracks straight from GitHub.
// Put MP3s in assets/audio/<Album Name>/*.mp3
// Put covers in assets/artwork/<Album Name>.(jpg|jpeg|png|webp|svg)
// No data.json edits needed.
const GH_OWNER = "TheDogsDinnerMusic";
const GH_REPO  = "rogues-records-site";
const BRANCH   = "main"; // change if you use a different branch
// ================================================================

const $ = s => document.querySelector(s);
const grid = $('#albumsGrid');
const emptyState = $('#emptyState');
const player = $('#player');
const playPauseBtn = $('#playPause');
const closePlayerBtn = $('#closePlayer');
const trackTitle = $('#trackTitle');
const progressBar = $('#progressBar');
const audio = new Audio();

let currentTrack = null;

function toTitle(name){
  // album folder or file -> nice title
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

async function buildLibrary(){
  $('#year').textContent = new Date().getFullYear();
  try {
    const audioDirs = await ghList('assets/audio');
    const albums = audioDirs.filter(item => item.type === 'dir');
    if (!albums.length) { emptyState.style.display='block'; return; }
    // For each album dir, fetch tracks
    const albumData = [];
    for (const alb of albums){
      const folder = alb.name;
      const files = await ghList(`assets/audio/${folder}`);
      const tracks = files
        .filter(f => f.type === 'file' && /\.mp3$/i.test(f.name))
        .sort((a,b) => a.name.localeCompare(b.name))
        .map(f => ({
          title: toTitle(f.name.replace(/\.\w+$/,'')),
          preview: `assets/audio/${encodeURIComponent(folder)}/${encodeURIComponent(f.name)}`
        }));
      if (!tracks.length) continue;
      // cover guess
      const coverCandidates = ['jpg','jpeg','png','webp','svg'].map(ext => `assets/artwork/${folder}.${ext}`);
      let cover = '';
      for (const c of coverCandidates){
        const res = await fetch(c, {method:'HEAD'});
        if (res.ok) { cover = c; break; }
      }
      albumData.push({ id: slug(folder), title: toTitle(folder), cover, tracks });
    }

    // Render
    grid.innerHTML = albumData.map(album => `
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
