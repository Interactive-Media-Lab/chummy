// This file is single chummy version connecting to the backend/actual CHUMMY unit
import "../App.css";
import React, { useState, useRef, useEffect } from 'react';
import { io } from "socket.io-client";

const ChummyCombined = ({ audioSrc }) => {
  // --- BPSD Event Log State ---
  const [bpsdEvents, setBpsdEvents] = useState([]);

  // --- Playlist state ---
  const [playlists, setPlaylists] = useState({});
  const [currentPlaylist, setCurrentPlaylist] = useState('');
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("radio");  // track mt vs radio
  const [patientName, setPatientName] = useState("Example Patient"); // You can make this dynamic
  const [showUserManual, setShowUserManual] = useState(false);

  // --- Audio state & ref ---
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const audioRef = useRef(null);

  // --- Handlers for audio ---
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

  // ——— Live "Now Playing" state ———
  const [liveSong, setLiveSong] = useState("—");

  // initialize socket inside the effect instead of top‐level
  useEffect(() => {
    const socket = io("http://172.20.10.3:5002", {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("songChanged", songName => {
      console.log("Live song update:", songName);
      setLiveSong(songName || "—");
      
      // Check if this is an MT song (folder starts with MT)
      if (songName && songName.includes('/')) {
        const parts = songName.split('/');
        if (parts.length >= 2) {
          const folderName = parts[0]; // First part is the folder name
          console.log("Extracted folder name:", folderName);
          
          if (folderName.startsWith('MT')) {
            console.log("Setting mode to MT");
            setMode("mt");
          } else if (folderName.startsWith('ChummyC')) {
            console.log("Setting mode to Radio");
            setMode("radio");
          } else {
            console.log("Unknown folder type:", folderName);
          }
        } else {
          console.log("Invalid song path format:", songName);
        }
      } else if (songName) {
        console.log("Song name without path:", songName);
      } else {
        console.log("No song name provided");
      }
    });
    
    socket.on("bpsdEvent", ({ songName, playedSecs, timestamp, effective, reason }) => {
      console.log("BPSD Event received:", { songName, playedSecs, timestamp, effective, reason });
      const timeLabel = new Date(timestamp).toLocaleString();
      const durationStr = `${Math.floor(playedSecs/60)}:${String(playedSecs%60).padStart(2,"0")}`;
      
      let effectText = effective ? "✅ Effective" : "❌ Ineffective";
      if (reason === "BPSD Finished") {
        effectText = "✅ Effective";
      }
      
      const newEvent = {
        time: timeLabel,
        song: songName,
        status: `for ${durationStr}`,
        effect: effectText,
        reason: reason // Add reason to the event object
      };
      
      console.log("Adding BPSD event:", newEvent);
      setBpsdEvents(prev => [newEvent, ...prev]);
    });
    
    return () => {
      socket.off("songChanged");
      socket.off("bpsdEvent");
      socket.disconnect();
    };
  }, []);

  // --- Helper function to get songs in current folder ---
  const getSongsInCurrentFolder = () => {
    if (!liveSong || liveSong === "—") {
      console.log("No live song, returning empty array");
      return [];
    }
    
    console.log("Getting songs for liveSong:", liveSong);
    console.log("Available playlists:", Object.keys(playlists));
    
    // Extract folder name from current song path
    const songPath = liveSong;
    console.log("Song path:", songPath);
    
    // Extract folder name from the song path (format: "folder/song.mp3")
    let folderName = null;
    
    if (songPath.includes('/')) {
      const parts = songPath.split('/');
      if (parts.length >= 2) {
        folderName = parts[0]; // First part is the folder name
        console.log("Extracted folder name:", folderName);
      }
    }
    
    if (!folderName) {
      console.log("Could not extract folder name from:", songPath);
      return [];
    }
    
    // Find all songs in the same folder
    const songsInFolder = [];
    console.log("Looking for playlist matching folder:", folderName);
    
    Object.keys(playlists).forEach(playlistName => {
      console.log("Checking playlist:", playlistName, "against folder:", folderName);
      if (playlistName === folderName) {
        console.log("Match found! Adding songs from playlist:", playlistName);
        songsInFolder.push(...playlists[playlistName]);
      }
    });
    
    console.log("Final songs in folder:", songsInFolder);
    return songsInFolder;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // Fetch playlists from backend API
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://172.20.10.3:5002/playlists");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setPlaylists(data);
        console.log("Loaded playlists:", data);
        
        // Set first available playlist as current
        const playlistNames = Object.keys(data);
        console.log("Playlist names:", playlistNames);
        if (playlistNames.length > 0) {
          setCurrentPlaylist(playlistNames[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError('Failed to load playlists');
        // Fallback to empty playlists
        setPlaylists({});
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  // --- Handlers for playlist management ---
  const handleSelectPlaylist = e => {
    setCurrentPlaylist(e.target.value);
    setCurrentTrackIndex(0);
  };

  const handleDeleteSong = idx => {
    if (!playlists[currentPlaylist]) return;
    setPlaylists(prev => {
      const arr = [...prev[currentPlaylist]];
      arr.splice(idx, 1);
      return { ...prev, [currentPlaylist]: arr };
    });
    if (idx === currentTrackIndex) setCurrentTrackIndex(0);
  };

  const handleMoveSongUp = idx => {
    if (idx === 0 || !playlists[currentPlaylist]) return;
    setPlaylists(prev => {
      const arr = [...prev[currentPlaylist]];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return { ...prev, [currentPlaylist]: arr };
    });
    if (currentTrackIndex === idx) setCurrentTrackIndex(idx - 1);
  };

  const handleMoveSongDown = idx => {
    if (!playlists[currentPlaylist]) return;
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
    if (!playlists[currentPlaylist]) return;
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
        <div className="dashboard-header">
          <h1 style={{ textAlign: 'center' }}>Room Dashboard (Single-chummy)</h1>
          <button 
            onClick={() => setShowUserManual(true)}
            className="user-manual-link"
          >
            📖 User Manual
          </button>
        </div>

        <div className="room-grid-2col">
          {/* BPSD Event Log */}
          <div className="bpsd-panel">
            <h2>BPSD Event Log</h2>
            <div className="bpsd-log">
              {bpsdEvents.map((event, i) => {
                console.log("Rendering BPSD event:", event);
                return (
                  <div className="bpsd-entry" key={i}>
                    <p className="bpsd-time">{event.time}</p>
                    <p>
                      🎵 Played <strong>{event.song || '—'}</strong> {event.status} - {event.effect}
                      {event.reason && (
                        <span> – <em>{event.reason}</em></span>
                      )}
                    </p>
                    {event.effect === '❌ Ineffective' && event.song2 && (
                      <p>🎵 Played <strong>{event.song2}</strong> {event.status2} – {event.effect2}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player & Playlist Management */}
          <div className="right-panel">
            <p>
              <strong>Client Name:</strong> {patientName}
            </p>
            <p><strong>Current Status:</strong>{' '}
              {console.log("Rendering status, mode:", mode)}
              <span 
                className="status-dot"
                style={{ backgroundColor: mode === 'mt' ? 'red' : 'limegreen' }} 
              /> 
              {mode === 'mt' ? 'MT' : 'Radio'}
            </p>

            {loading && <p>Loading playlists...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            
            {!loading && !error && Object.keys(playlists).length > 0 && (
              <>
                {/* Live Now Playing Section */}
                <p>
                  <strong>Live Now Playing:</strong> {liveSong}
                </p>

                {/* Songs in Current Folder */}
                {liveSong !== "—" && (
                  <div>
                    <label><strong>Manage Current Folder:</strong></label>
                    {console.log("Rendering songs in folder, liveSong:", liveSong)}
                    {(() => {
                      const songs = getSongsInCurrentFolder();
                      console.log("Songs found for UI:", songs);
                      return null;
                    })()}
                    <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
                      {getSongsInCurrentFolder().map((song, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                            padding: '4px',
                            backgroundColor: song === liveSong.split('/').pop() ? '#f0f0f0' : 'transparent'
                          }}
                        >
                          <span>{idx + 1}. {song}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {!loading && !error && Object.keys(playlists).length === 0 && (
              <p>No playlists found. Make sure your music directory contains MP3 files or folders with MP3 files.</p>
            )}
          </div>
        </div>
      </div>

      {/* User Manual Popup Modal */}
      {showUserManual && (
        <div className="user-manual-overlay">
          <div className="user-manual-modal">
            <button 
              onClick={() => setShowUserManual(false)}
              className="user-manual-close"
            >
              ×
            </button>
            
            <h2 className="user-manual-title">User Manual</h2>
            
            <div className="user-manual-content">
              <div className="user-manual-section">
                <h3>🎵 Music Playback</h3>
                <ul>
                  <li><strong>Radio Mode:</strong> Plays songs from ChummyC1, ChummyC2, ChummyC3 folders in random order</li>
                  <li><strong>MT Mode:</strong> Plays songs from MT1, MT2 folders sequentially for BPSD therapy</li>
                  <li><strong>Channel Rotary Encoder:</strong> Rotate to switch between radio channels</li>
                </ul>
              </div>

              <div className="user-manual-section">
                <h3>🔘 Button Controls</h3>
                <ul>
                  <li><strong>Red Button:</strong> Switch to MT mode or next song in MT mode</li>
                  <li><strong>Green Button:</strong> Return to Radio mode</li>
                  <li><strong>Pause Button:</strong> Pause/resume current song</li>
                </ul>
              </div>

              <div className="user-manual-section">
                <h3>📊 BPSD Event Log</h3>
                <ul>
                  <li><strong>✅ Effective:</strong> Song played to completion</li>
                  <li><strong>❌ Ineffective:</strong> Song interrupted before completion</li>
                  <li><strong>✅ BPSD Finished:</strong> User manually finished song in MT mode when BPSD ends</li>
                </ul>
              </div>

              <div className="user-manual-section">
                <h3>👤 Patient Status</h3>
                <ul>
                  <li><strong>🔴 MT:</strong> Currently in BPSD therapy mode</li>
                  <li><strong>🟢 Radio:</strong> Currently in normal radio mode</li>
                </ul>
              </div>

              <div className="user-manual-section">
                <h3>📁 Current Folder</h3>
                <ul>
                  <li>Shows all songs in the same folder as the currently playing song</li>
                  <li>Highlights the currently playing song</li>
                  <li>Updates in real-time as songs change</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChummyCombined;
