import "../App.css";
import React, { useState, useRef, useEffect } from 'react';

const SingleVersion = ({ audioSrc }) => {
  const bpsdEvents = [
  { time: '2:03 PM, Jun 13, 2025', status: 'for 40 sec', effect: "✅ Effective", song: 'Awake' },
  { time: '11:34 AM, Jun 13, 2025', status: 'for 1 min 23 sec', effect: "✅ Effective", song: 'I Came Running' },
  { time: '8:46 AM, Jun 12, 2025', status: 'for 12 sec', effect: "❌ Ineffective", song: 'Intro',
    status2: 'for 1 min 5 sec', effect2: "✅ Effective", song2: 'Courage' },
  { time: '7:39 AM, Jun 10, 2025', status: 'for 3 min 11 sec', effect: "✅ Effective", song: 'Night Drive' },
];


  // --- Playlist state ---
  const [playlists, setPlaylists] = useState({
    'Playlist A': ['Awake', 'Intro', 'Courage'],
    'Playlist B': ['Night Drive', 'I Came Running']
  });
  const [currentPlaylist, setCurrentPlaylist] = useState('Playlist A');
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // --- Audio state & ref (unchanged) ---
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const audioRef = useRef(null);

  // --- Handlers for audio (unchanged) ---
  const handleSeek = e => {
    audioRef.current.currentTime = e.target.value;
    setCurrentTime(e.target.value);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration);
  };

  const handlePlay = () => {
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) handlePause();
    else handlePlay();
  };

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // --- Handlers for playlist management ---
  const handleSelectPlaylist = e => {
    setCurrentPlaylist(e.target.value);
    setCurrentTrackIndex(0);
  };

  const handleDeleteSong = idx => {
    setPlaylists(prev => {
      const arr = [...prev[currentPlaylist]];
      arr.splice(idx, 1);
      return { ...prev, [currentPlaylist]: arr };
    });
    if (idx === currentTrackIndex) setCurrentTrackIndex(0);
  };

  const handleMoveSongUp = idx => {
    if (idx === 0) return;
    setPlaylists(prev => {
      const arr = [...prev[currentPlaylist]];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return { ...prev, [currentPlaylist]: arr };
    });
    if (currentTrackIndex === idx) setCurrentTrackIndex(idx - 1);
  };

  const handleMoveSongDown = idx => {
    const len = playlists[currentPlaylist].length;
    if (idx === len - 1) return;
    setPlaylists(prev => {
      const arr = [...prev[currentPlaylist]];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return { ...prev, [currentPlaylist]: arr };
    });
    if (currentTrackIndex === idx) setCurrentTrackIndex(idx + 1);
  };

  const handleRenameSong = idx => {
    const newName = prompt('Enter new filename:', playlists[currentPlaylist][idx]);
    if (!newName) return;
    setPlaylists(prev => {
      const arr = [...prev[currentPlaylist]];
      arr[idx] = newName;
      return { ...prev, [currentPlaylist]: arr };
    });
  };

  // --- UI render ---
  return (
    <div className="center-wrapper">
      <div className="outer-box">
        <h1 style={{ textAlign: 'center' }}>Room Dashboard (Single-chummy)</h1>

        <div className="room-grid-2col">
          {/* BPSD Event Log */}
          <div className="bpsd-panel">
            <h2>BPSD Event Log</h2>
            <div className="bpsd-log">
              {bpsdEvents.map((event, i) => (
            <div className="bpsd-entry" key={i}>
                <p className="bpsd-time">{event.time}</p>
                <p>🎵 Played <strong>{event.song || '—'}</strong> {event.status} - {event.effect}</p>
                        {event.effect === '❌ Ineffective' && event.song2 && (
              <p>🎵 Played <strong>{event.song2}</strong> {event.status2} – {event.effect2}</p>
            )}
            </div>
            ))}

            </div>
          </div>

          {/* Player & Playlist Management */}
          <div className="right-panel">
            <p>
              <strong>Client Name:</strong> xxx</p>
              <p><strong>Current Status:</strong>{' '}
              <span className="dot" style={{ backgroundColor: 'limegreen' }} /> Normal
            </p>

            {/* Select & Show Status */}
              <label style={{marginBlock: '10px' }}><strong>Currently playing:</strong></label>
              <select value={currentPlaylist} onChange={handleSelectPlaylist}>
                {Object.keys(playlists).map(pl => (
                  <option key={pl}>{pl}</option>
                ))}
              </select>
              <p>
                <strong>Now Playing:</strong>{' '}
                {playlists[currentPlaylist][currentTrackIndex]}
              </p>
            

            {/* Track list with delete, reorder, rename */}
            <div>
              <label><strong>Manage Tracks:</strong></label>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {playlists[currentPlaylist].map((song, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}
                  >
                    <span>{idx + 1}. {song}</span>
                    <div>
                      <button onClick={() => handleMoveSongUp(idx)} disabled={idx === 0}>↑</button>
                      <button
                        onClick={() => handleMoveSongDown(idx)}
                        disabled={idx === playlists[currentPlaylist].length - 1}
                      >↓</button>
                      <button onClick={() => handleRenameSong(idx)}>✏️</button>
                      <button onClick={() => handleDeleteSong(idx)}>🗑️</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Audio player */}
            <div className="player-card">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
              />
              <audio ref={audioRef} src={audioSrc} />
              <div className="track-duration">
                <p>{formatTime(currentTime)}</p>
                <p>{formatTime(duration)}</p>
              </div>
              <button onClick={handlePlayPause} className="play-pause-btn">
                <span className="material-symbols-rounded">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <label><strong>Upload new music to:</strong></label>
              <select>
                {Object.keys(playlists).map(pl => (
                  <option key={pl}>{pl}</option>
                ))}
              </select>
              <div>
                <button
                  className="upload-btn"
                  onClick={() => alert('Open Upload Popup')}
                >Upload</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleVersion;
