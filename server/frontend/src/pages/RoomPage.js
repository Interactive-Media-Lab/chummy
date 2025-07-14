import "../App.css";
import { useParams } from 'react-router-dom';

const roomInfo = {
  101: {patient: "Alice", status: "Normal",
      playlist: "-",
      notes: []},
  102: {patient: "Bob", status: "Music therapy playing",
      playlist: "Playlist A",
      notes: ["Once BPSD detected, play Playlist A"]},
  103: {patient: "Charlie", status: "BPSD detected",
      playlist: "-",
      notes: []},
  104: {patient: "Diana", status: "Normal",
      playlist: "-",
      notes: []},
  105: {patient: "Ethan", status: "Normal",
      playlist: "-",
      notes: []},
  106: {patient: "Fiona", status: "Normal",
      playlist: "-",
      notes: []},
  107: {patient: "George", status: "Normal",
      playlist: "-",
      notes: []},
  108: {patient: "Hannah", status: "Music therapy playing",
      playlist: "-",
      notes: []},
};

function RoomPage() {
  const { roomId } = useParams();
  const info = roomInfo[roomId] || {
    patient: "Unknown",
    status: "Normal",
    playlist: "-",
    notes: [],
    photo: "/patient-photos/default.png",
  };

  return (
    <div className="center-wrapper">
      <div className="outer-box">
        <h1>Room {roomId} Dashboard</h1>
        <div className="room-grid-2col">
          <div className="left-panel">
            <p><strong>Patient Name:</strong> {info.patient}</p>
            <p><strong>Current Status:</strong> <span className="dot" style={{ backgroundColor: "limegreen" }} />{info.status}</p>

            <p><strong>Special note:</strong> None</p>
            <ul>
              {info.notes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>

            <div className="section">
              <label><strong>Currently playing:    </strong></label>
              <select defaultValue={info.playlist}>
                <option>Playlist A</option>
                <option>Playlist B</option>
              </select>
            </div>

            <div className="audio-player-mockup">
            <div style={{ marginTop: "5px" }}>[Music Player Placeholder]</div>
            </div>

            <div className="section">
              <label><strong>Upload new music to:    </strong></label>
              <select>
                <option>Playlist A</option>
                <option>Playlist B</option>
              </select>
              <div><button className="upload-btn" onClick={() => alert("Open Upload Popup")}>Upload</button></div>
            </div>
          </div>

          <div className="right-panel">
            <img src="/Default-photo.jpg" alt="Default Patient" className="patient-photo" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;