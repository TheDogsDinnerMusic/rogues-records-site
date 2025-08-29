
const $ = s => document.querySelector(s);
const grid = $('#albumsGrid');
const player = $('#player');
const playPauseBtn = $('#playPause');
const closePlayerBtn = $('#closePlayer');
const trackTitle = $('#trackTitle');
const progressBar = $('#progressBar');
const contactEmail = $('#contactEmail');
const contactPhone = $('#contactPhone');
const audio = new Audio();

let currentTrack = null;

async function boot(){
  $('#year').textContent = new Date().getFullYear();

  const [cfg, data] = await Promise.all([
    fetch('config.json').then(r=>r.json()),
    fetch('data.json').then(r=>r.json())
  ]);

  contactEmail.textContent = cfg.contact.email;
  contactEmail.href = `mailto:${cfg.contact.email}`;
  contactPhone.textContent = cfg.contact.phone;
  contactPhone.href = `tel:${cfg.contact.phone.replace(/\s+/g,'')}`;

  grid.innerHTML = data.albums.map(album => {
    const art = `assets/artwork/${album.id}.svg`;
    return `
      <article class="card">
        <div class="cover" style="background-image:url('${art}');background-size:cover;background-position:center;">
          <div class="badge">
            <div class="album-series">${album.series||''}</div>
            <div class="album-title">${album.title||''}</div>
          </div>
        </div>
        <div class="card-body">
          <ul class="tracks">
            ${album.tracks.map(t => `
              <li class="track">
                <button class="play" data-src="${t.preview||''}" data-title="${album.title||''} — ${t.title||''}" ${t.preview?'':'disabled'}>${t.preview?'►':'–'}</button>
                <div class="track-title" title="${t.title||''}">${t.title||''}</div>
                <div class="dur">${t.duration||''}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.play').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-src');
      const title = btn.getAttribute('data-title');
      if (!src) return;
      playTrack(title, src);
    });
  });

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
    alert('Playback failed. Replace preview files or try again.');
  });
}

function stop(){
  audio.pause(); audio.currentTime = 0;
  currentTrack = null;
  player.classList.add('hidden');
  progressBar.style.width = '0%';
  playPauseBtn.textContent = '►';
}

boot();
