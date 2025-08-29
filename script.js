const $ = (s) => document.querySelector(s);
const grid = $('#albumsGrid');
const emptyState = $('#emptyState');
const player = $('#player');
const playPauseBtn = $('#playPause');
const closePlayerBtn = $('#closePlayer');
const trackTitle = $('#trackTitle');
const progressBar = $('#progressBar');
const audio = new Audio();

let currentTrack = null;

function cardHtml(album) {
  const img = album.cover ? `<img src="${album.cover}" alt="${album.title} cover">` : '';
  return `
  <article class="card">
    <div class="cover">
      ${img}
      <div class="badge"><div class="album-title">${album.title || ''}</div></div>
    </div>
    <div class="card-body">
      <ul class="tracks">
        ${album.tracks
          .map(
            (t) => `
          <li class="track">
            <button class="play" data-src="${t.preview || ''}" data-title="${album.title || ''} — ${t.title || ''}" ${
              t.preview ? '' : 'disabled'
            }>►</button>
            <div class="track-title" title="${t.title || ''}">${t.title || ''}</div>
          </li>`
          )
          .join('')}
      </ul>
    </div>
  </article>`;
}

function render(albums) {
  if (!albums || !albums.length) {
    emptyState.style.display = 'block';
    return;
  }
  grid.innerHTML = albums.map(cardHtml).join('');
  grid.querySelectorAll('.play').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-src');
      const title = btn.getAttribute('data-title');
      if (!src) return;
      playTrack(title, src);
    });
  });
}

function playTrack(title, src) {
  currentTrack = src;
  trackTitle.textContent = title;
  audio.src = src;
  audio.play().then(() => {
    player.classList.remove('hidden');
    playPauseBtn.textContent = '❚❚';
  }).catch((e) => {
    console.error(e);
    alert('Playback failed for ' + src);
  });
}

function stop() {
  audio.pause();
  audio.currentTime = 0;
  currentTrack = null;
  player.classList.add('hidden');
  progressBar.style.width = '0%';
  playPauseBtn.textContent = '►';
}

playPauseBtn.addEventListener('click', () => {
  if (!currentTrack) return;
  if (audio.paused) audio.play().then(() => (playPauseBtn.textContent = '❚❚'));
  else {
    audio.pause();
    playPauseBtn.textContent = '►';
  }
});
closePlayerBtn.addEventListener('click', stop);
audio.addEventListener('timeupdate', () => {
  const pct = (audio.currentTime / (audio.duration || 1)) * 100;
  progressBar.style.width = `${pct}%`;
});
audio.addEventListener('ended', stop);

(async function boot() {
  $('#year').textContent = new Date().getFullYear();
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    const data = await res.json();
    render(data.albums || []);
  } catch (e) {
    console.error(e);
    emptyState.style.display = 'block';
  }
})();
