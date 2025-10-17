if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
let activeInternalPl;
let playbackErrorCountToLimitAutoNext = 0;
let didPlayerLoad = false;
let isShufflePending;
const playerWrapperEl = document.querySelector('.player-wrapper');
const previousButtonEl = playerWrapperEl.querySelector('.previous-button');
const nextButtonEl = playerWrapperEl.querySelector('.next-button');
const bigPlayButtonEl = playerWrapperEl.querySelector('.big-play-button');
const loadingSpinnerEl = playerWrapperEl.querySelector('.loading-spinner');
const videoTitleEl = playerWrapperEl.querySelector('.video-title');
const playerBottomAdBlurEl = playerWrapperEl.querySelector('.player-bottom-ad-blur');

const playlistIntroEl = document.querySelector('.playlist-intro');
const playlistsWrapperEl = document.querySelector('.playlists-wrapper');

const byobYoutubeLinkEl = document.querySelector('.byob-youtube-link');

let globalAnimationLockMs = 0;
let nextPreviousAnimationLockMs = 0;

notifyIfBrowserIsNotCompat();

function init() {
  console.log('init()');

  plyr.play();

  showNotPlayingState();

  previousButtonEl.onclick = (e) => {
    console.log('previousButtonEl clicked');
    e.preventDefault();
    getYoutubePlayer().previousVideo();
  };

  nextButtonEl.onclick = (e) => {
    console.log('nextButtonEl clicked');
    e.preventDefault();
    getYoutubePlayer().nextVideo();
  };

  bigPlayButtonEl.onclick = (e) => {
    console.log('bigPlayButtonEl clicked');
    e.preventDefault();
    plyr.play();
  };

  playerBottomAdBlurEl.onclick = (e) => {
    console.log('playerBottomAdBlurEl clicked');
    e.preventDefault();
    plyr.togglePlay();
  };

  playerWrapperEl.onmousemove = (e) => {
    showNextPreviousButtons(true);
  };

  document.addEventListener('keydown', event => {
    if (byobYoutubeLinkEl === document.activeElement) { return; }

    console.log(`Pressed ${event.code}`);
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        plyr.togglePlay();
        break;
      case 'KeyT':
        // startPlaylist("PLmFgO4C0SOsjC1xn5QO-Uq1On40C3JnNk");//TEST Playlist
        break;
      case 'ArrowRight':
        event.preventDefault();
        getYoutubePlayer().nextVideo();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        getYoutubePlayer().previousVideo();
        break;
    }
  });

  getYoutubePlayer().addEventListener("onError", (event) => {
    console.log(`onYoutubePlayerError: ${event.data}`);
    if (event.data >= 100) {
      console.log('onYoutubePlayerError: AutoNext')
      playbackErrorCountToLimitAutoNext += 1;
      if (playbackErrorCountToLimitAutoNext <= 3) {
        getYoutubePlayer().nextVideo();
      } else {
        setTimeout(() => {
          showPlayingState();
        }, 500);
        setTimeout(() => {
          showPlayingState();
        }, 4000);
      }
    }
  });

  byobYoutubeLinkEl.oninput = (event) => {
    console.log(`byobYoutubeLinkEl: ${byobYoutubeLinkEl.value}`);
    byobYoutubeLinkEl.value = byobYoutubeLinkEl.value.trim();
    startVideoFromUrl(byobYoutubeLinkEl.value);
  };

  // Maybe we got a query param
  startVideoFromUrl(window.location.href);
}

function injectPlaylists() {
  for (let pl of playlists) {
    let cardEl = document.createElement("DIV");
    cardEl.innerText = pl.title;
    cardEl.classList.add('playlist-item');
    cardEl.onclick = () => {
      console.log(`click ${pl.title} ${pl.id}`);
      activeInternalPl = pl;
      startPlaylist(pl.id);
    };
    // cardEl.style.background = `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.82)), url(https://i.ytimg.com/vi/${pl.videoId}/maxresdefault.jpg)`;
    cardEl.style.backgroundImage = `radial-gradient(rgba(255,255,255,1), rgba(255,255,255,0.75)), url(https://i.ytimg.com/vi/${pl.videoId}/hqdefault.jpg)`;
    // cardEl.style.backgroundSize = 'contain';
    cardEl.style.backgroundPosition = 'center';
    cardEl.style.backgroundSize = 'auto';
    playlistsWrapperEl.insertBefore(cardEl, byobYoutubeLinkEl);
  }
}

function showPlayingState() {
  console.log('showPlayingState()');
  playerWrapperEl.style.display = 'block'; //Show player that is initially hidden until play
  getYoutubePlayer().unMute();
  getYoutubePlayer().setLoop(true);
  if (activeInternalPl && !activeInternalPl.shuffle) {
    getYoutubePlayer().setShuffle(false);
  } else {
    getYoutubePlayer().setShuffle(true);
  }
  if (isShufflePending) {
    console.log('showPlayingState() isShufflePending=truthy');
    isShufflePending = false;
    getYoutubePlayer().nextVideo();
    getYoutubePlayer().setVolume(100);
  }

  showNextPreviousButtons(true);

  hideEl(videoTitleEl);
  hideEl(loadingSpinnerEl);
  hideEl(bigPlayButtonEl);
  let animationLock = Date.now();
  globalAnimationLockMs = animationLock;
  setTimeout(() => {
    if (animationLock !== globalAnimationLockMs) { return; }

    hideEl(videoTitleEl);
    hideEl(loadingSpinnerEl);
    hideEl(bigPlayButtonEl);
    getYoutubePlayerIframe().style.filter = '';
  }, 200);

}

function showNotPlayingState() {
  console.log('showNotPlayingState()');
  getYoutubePlayer().mute();

  getYoutubePlayerIframe().style.filter = 'blur(1vw)';

  let videoData = getYoutubePlayer().getVideoData();
  if (videoData && videoData.title) {
    videoTitleEl.textContent = videoData.title;
  }

  let animationLock = Date.now();
  globalAnimationLockMs = animationLock;
  setTimeout(() => {
    if (animationLock !== globalAnimationLockMs) { return; }

    showEl(videoTitleEl);
    showNextPreviousButtons(false);

    hideEl(loadingSpinnerEl);
    hideEl(bigPlayButtonEl);
    //3 is buffering, -1 is unstarted, 5 is initial state
    let playerState = getYoutubePlayer().getPlayerState();
    console.log(`showNotPlayingState() ${playerState}`);
    if (playerState === 3 || playerState === -1 || playerState === 5) {
      showEl(loadingSpinnerEl);
    } else {
      showEl(bigPlayButtonEl);
    }
  }, 5);
}

function showNextPreviousButtons(fadeSoonAfter) {
  showEl(previousButtonEl);
  showEl(nextButtonEl);
  let animationLock = Date.now();
  nextPreviousAnimationLockMs = animationLock;

  if (fadeSoonAfter) {
    setTimeout(() => {
      if (animationLock !== nextPreviousAnimationLockMs) { return; }

      hideEl(previousButtonEl);
      hideEl(nextButtonEl);
    }, 4000);
  }
}

function hideEl(el) {
  el.style.display = 'none';
}

function showEl(el) {
  el.style.display = 'block';
}


function getYoutubePlayer() {
  return plyr.embed;
}

function getYoutubePlayerIframe() {
  return getYoutubePlayer().getIframe();
}

function startPlaylist(playlistId) {
  if (!didPlayerLoad) { return; }

  if (activeInternalPl && activeInternalPl.id == playlistId && !activeInternalPl.shuffle) {
    isShufflePending = false;
  } else {
    isShufflePending = true;
  }

  getYoutubePlayer().loadPlaylist({ list: playlistId });
  //Show player that is initially hidden until play
  playerWrapperEl.style.display = 'block';
  playerWrapperEl.scrollIntoView();
  playlistIntroEl.style.display = 'block';
}

function startVideoFromUrl(urlString) {
  if (!didPlayerLoad) { return; }

  try {
    let playlistId = parseYoutubePlaylistId(urlString);
    if (playlistId && playlistId.length >= 6) {
      activeInternalPl = null;
      startPlaylist(playlistId);
  
    } else {
      let videoId = parseYoutubeId(urlString);
      console.log(`startVideoFromUrl got id=${videoId} from ${urlString}`);
      if (!videoId || videoId.length <= 6) { return; }

      activeInternalPl = null;
      getYoutubePlayer().loadVideoById(videoId);
    }
  
    //Show player that is initially hidden until play
    playerWrapperEl.style.display = 'block';
    playerWrapperEl.scrollIntoView();
    playlistIntroEl.style.display = 'block';
  } catch(e) {
    console.log(`${urlString}`, e);
  }

}

function notifyIfBrowserIsNotCompat() {
  let result = bowser.getParser(window.navigator.userAgent);
  let isValidBrowser = result.satisfies({
    chrome: ">=76",
    // firefox: ">31",
    opera: ">=64",
    edge: ">=17",
    safari: ">=9",
  });

  console.log(`isBrowserCompat=${isValidBrowser} ${result.getBrowserName()}`);
  if (!isValidBrowser) {
    alert('Please use Chrome or Safari or Edge to view this site.')
  }
}

function parseYoutubePlaylistId(urlString) {
  let url = new URL(urlString);
  return url.searchParams.get('list');
}

function parseYoutubeId(url) {
  // https://gist.github.com/takien/4077195
  let ID = '';
  url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  if (url[2] !== undefined) {
    ID = url[2].split(/[^0-9a-z_\-]/i);
    ID = ID[0];
  }
  else {
    ID = url;
  }
  return ID;
}



// Change "{}" to your options:
// https://github.com/sampotts/plyr/#options
let plyr = new Plyr('#plyr-player', {
  volume: 1,
  autoplay: true,
  muted: false,
  clickToPlay: true,
  disableContextMenu: true,
  hideControls: false,
  controls: [
    // 'play-large',
    'play',
    'progress',
    'current-time',
    'mute',
    'volume',
    'captions',
    'settings',
    // 'pip',
    // 'airplay', 
    // 'fullscreen'
  ],
  keyboard: { focused: false, global: false },
  fullscreen: { enabled: false, fallback: false, iosNative: false },
  ads: { enabled: false, publisherId: '' },
});

plyr.on('statechange', (event) => {
  let playerStatus = event.detail.code;
  let playerStatusText = '';
  switch (playerStatus) {
    case -1:
      playerStatusText = 'unstarted';
      showNotPlayingState();
      break;
    case 0:
      playerStatusText = 'ended';
      showNotPlayingState();
      break;
    case 1:
      playerStatusText = 'playing';
      playbackErrorCountToLimitAutoNext = 0;
      showPlayingState();
      break;
    case 2:
      playerStatusText = 'paused';
      showNotPlayingState();
      break;
    case 3:
      playerStatusText = 'buffering';
      showNotPlayingState();
      break;
  }
  console.log(`onPlayerStateChange: ${playerStatus} ${playerStatusText}`);
});

plyr.on('error', (event) => {
  console.log('error');
  didPlayerLoad = true;
});

plyr.on('ready', (event) => {
  console.log('ready');
  didPlayerLoad = true;
  init();
});

const playlists = [
  { id: "PLmFgO4C0SOsisfSSyf3p2YfeIRcQaFFLD", title: "Jewish Acappella \n(350+ Songs)\n", videoId: 'Q9HqJTD2E0Q', shuffle: true },
  { id: "PLgWWM18u2RI3Hl28lVFH96erkb1Vro-lk", title: "Maccabeats Acappella \n(42+ Songs)\n", videoId: 'oHwyTxxQHmQ', shuffle: true },

  { id: "PLmFgO4C0SOsj1oA9kvsC7hCeJBGh2yrQw", title: "NBA Highlights and Replays \n(100+ Videos)\n", videoId: 'ijl1F1mnm_A', shuffle: true },
  // { id: "PLmFgO4C0SOsjy8ubNSVF9G94G4NBXH2D6", title: "NFL Highlights and Replays \n(220+ Videos)\n", videoId: 'W0dqE-9rcpg', shuffle: true },

  { id: "PLmFgO4C0SOsi7iiOH4OBYfEnyisECv71T", title: "How It's Made \n(750+ Videos)\n", videoId: '9Pclv-f_zPw', shuffle: true },
  { id: "PLmFgO4C0SOsivoJyctuHcmVRv2exrkq-P", title: "Bill Nye the Science Guy \n(40+ Videos)\n", videoId: 'YKQrA563brM', shuffle: true },
  
  { id: "PLmFgO4C0SOsjd9evapPcZ2WL3JwC-C_ci", title: "Master Chef Junior \n(85+ Videos)\n", videoId: 'aSNu2XmwTwk', shuffle: true },
  // https://www.youtube.com/playlist?list=PL9b2z91oSo5-0jZYavxhe8nQFjpCYkO6w
  { id: "PLmFgO4C0SOshaqv6cXRcdQzKW-sVEgnK7", title: "Chopped Junior \n(48+ Videos)\n", videoId: 'RxmvWwtRmG8', shuffle: true },
  { id: "PLmFgO4C0SOshU_-w_D_VxZ0-Qpqv0R0TW", title: "Food Hacks For Kids \n(99+ Videos)\n", videoId: 'kBmbZcYl2vs', shuffle: true },

  { id: "PLmFgO4C0SOsjpkHCzDO6sPBzVxWHLsnfs", title: "Safari Live | National Geographic Kids \n(50+ Videos)\n", videoId: 'OUl7OnStLmo', shuffle: true },
  { id: "PLmFgO4C0SOsgGTEaT-WuxkR8waXbIg2UT", title: "Weird But True! | National Geographic Kids \n(115+ Videos)\n", videoId: 'TX4LurBSq9M', shuffle: true },
  { id: "PLmFgO4C0SOsinaMzHWQX5zHImTRQG8XVq", title: "Amazing Animals | National Geographic Kids \n(40+ Videos)\n", videoId: 'tlZwYsJpqjo', shuffle: true },
  
  
    // https://www.youtube.com/playlist?list=UUfXD2JoagtH-hMoVmNrqjsA
    { id: "UUfXD2JoagtH-hMoVmNrqjsA", title: "Music Class with Morah Kira \n(32+ Songs)\n", videoId: 'P-mNEARYxSM', shuffle: true },
    // maybe just put the compilations? https://www.youtube.com/playlist?list=PLizo1Ckr2mca0cs1xb6Z2Jum7tinWVCmo
    { id: "PLizo1Ckr2mca0cs1xb6Z2Jum7tinWVCmo", title: "Preschool Music Lessons From The Prodigies Music Curriculum \n(10+ Songs)\n", videoId: 'VTmk_ADNOgg', shuffle: true },
    { id: "PLizo1Ckr2mcb_IG3AAI788n8oNcZ1J0xR", title: "Preschool Learning Videos From The Prodigies Music Curriculum \n(10+ Songs)\n", videoId: 'z9WAvSPjHmY', shuffle: true },
    { id: "PLmFgO4C0SOsgsykuI-LTcv08nGaaBGX-I", title: "Reading Children's Story Books \n(160+ Videos)\n", videoId: 'KwF8WLXb4fk', shuffle: true },  

  
  // { id: "PLgWWM18u2RI2l4ViZ5Jw3j8rL8_AID2uF", title: "Maccabeats Passover Acappella Music" },
  // { id: "PLgWWM18u2RI0sAiiWDjmaPFa6s16KLd7A", title: "Maccabeats Hanukkah Acappella Music" },
  // { id: "PLgWWM18u2RI3x0sD5oPgJgsaiucz2RDzW", title: "Maccabeats Rosh Hashanah Acappella Music" },
  { id: "PLmFgO4C0SOsgivMkikthVr97S8C5S0tXw", title: "Key Events - History of Israel Explained \n(10+ Videos)\n", videoId: 'zdt4L6VTbi4', shuffle: false },
  { id: "PLmFgO4C0SOsglcJx73D9tt169RNXHRHly", title: "Key Events - Six Day War \n(10+ Videos)\n", videoId: 'KqS8BQDjYpw', shuffle: false },
  
  { id: "PLebBR0XgC_BZam9E0VAHnbRcLEqpCIluA", title: "Pillar of Fire (עמוד האש) Zionism Mini Series \n(7+ Videos)\n", videoId: 'Scxjr1eaXmU', shuffle: false },
  { id: "PLpIseRpqF0KrKPnuG0lQJj3b_DXmmKURk", title: "Tkuma, The First 50 Years Israel History Mini Series \n(6+ Videos)\n", videoId: 'y3dq-QgU1kw', shuffle: false },
  
  { id: "PLmFgO4C0SOsjPtioE3W7Ft-kCkKk-4afg", title: "All About Israel \n(5+ Videos)\n", videoId: 'NwGlRcXefZo', shuffle: true },

  { id: "PLmFgO4C0SOshRj_29d3Ek7Lmra-cvgivJ", title: "Super WHY! Full Episodes (Non-USA Playback Only) - Season 1 \n(36+ Videos)\n", videoId: 'gPTOvG2aGwI', shuffle: false },
  { id: "PLmFgO4C0SOsjyfFvBr75bfSwlyBp_eILQ", title: "Super WHY! Full Episodes (Non-USA Playback Only) - Season 2 \n(23+ Videos)\n", videoId: 'ebswO5xW_hM', shuffle: false },
]
injectPlaylists();
