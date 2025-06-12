import "../App.css";
import React, { useState, useRef } from 'react';

const SingleVersion = ({audioSrc}) => {
        // State variables to manage player's status and current time
        const [isPlaying, setIsPlaying] = useState(false);
        const [currentTime, setCurrentTime] = useState(0);
        const [duration, setDuration] = useState(0);

        const audioRef = useRef(null);

        // Function to seek to a specific time in the audio track
        const handleSeek = (e) => {
            audioRef.current.currentTime = e.target.value;
            setCurrentTime(e.target.value);
        }

        // Function to update the current time and duration of the audio track
        const handleTimeUpdate = () => {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration);
        }

        // Function to handle playing the audio
        const handlePlay = () => {
            audioRef.current.play();
            setIsPlaying(true);
        }

        // Function to handle pausing the audio
        const handlePause = () => {
            audioRef.current.pause();
            setIsPlaying(false);
        }

        // Function to handle play/pause functionality
        const handlePlayPause = () => {
            if (isPlaying) {
                handlePause();
            } else {
                handlePlay();
            }
        }

        // Function to format time in MM:SS format
        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const formattedSeconds = secs.toString().padStart(2, '0');
            return `${minutes}:${formattedSeconds}`;
        }

        // Use an effect to listen for time updates on the audio element
        React.useEffect(() => {
            const audio = audioRef.current;
            if (!audio) return;

            audio.addEventListener('timeupdate', handleTimeUpdate);

            return () => {
                // Clean up only if ref is still valid
                if (audio) {
                    audio.removeEventListener('timeupdate', handleTimeUpdate);
                }
            };
        }, []);

    return (
        <div className="center-wrapper">
            <div className="outer-box">
                <h1 style={{ textAlign:"center"}}>Room Dashboard (Single-chummy)</h1>
                <div className="room-grid-2col">
                <div className="left-panel">
                    <p><strong>Patient Name:</strong> xxx</p>
                    <p><strong>Current Status:</strong> <span className="dot" style={{ backgroundColor: "limegreen" }} />Normal</p>

                    <p><strong>Special note:</strong> None</p>
                    <div className="section">
                    <label><strong>Currently playing:    </strong></label>
                    <select defaultValue="Playlist A">
                        <option>Playlist A</option>
                        <option>Playlist B</option>
                    </select>
                    </div>

                    <div className="player-card">
                        <img src='/Music-Cover.jpg' alt="Music Cover" className="music-photo"/>
                        {/* Input range for seeking within the audio track */}
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={handleSeek}
                            />

                        {/*Audio element for playing music*/}
                        <audio ref={audioRef} src={audioSrc} />

                        {/* Display current and total duration of track */}
                        <div className="track-duration">
                            <p>{formatTime(currentTime)}</p>
                            <p>{formatTime(duration)}</p>
                        </div>
                        {/* Play/Pause button */}
                        <button onClick={handlePlayPause} className="play-pause-btn">
                            <span class="material-symbols-rounded">
                                {isPlaying ? "pause" : "play_arrow"}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="right-panel">
                    <img src="/Default-photo.jpg" alt="Default Patient" className="patient-photo" />
                    <div className="section">
                    <label><strong>Upload new music to:    </strong></label>
                    <select>
                        <option>Playlist A</option>
                        <option>Playlist B</option>
                    </select>
                    <div><button className="upload-btn" onClick={() => alert("Open Upload Popup")}>Upload</button></div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}

export default SingleVersion;