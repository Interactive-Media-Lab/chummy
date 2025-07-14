import { useNavigate } from "react-router-dom";
import "../App.css";

const roomData = [
  { id: 101, status: "normal" },
  { id: 102, status: "mt" },
  { id: 103, status: "bpsd" },
  { id: 104, status: "normal" },
  { id: 105, status: "normal" },
  { id: 106, status: "normal" },
  { id: 107, status: "normal" },
  { id: 108, status: "mt" },
];

const statusColor = {
  normal: "limegreen",
  mt: "gold",
  bpsd: "red",
};

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="center-wrapper">
      <div className="outer-box floorplan">
        <h1 className="page-title">Room List</h1>
        <div className="room-grid">
          {roomData.map((room) => (
            <div key={room.id} className="room-card" onClick={() => navigate(`/room/${room.id}`)}>
              <div className="room-name">Room {room.id}</div>
              <div className="room-status" style={{ backgroundColor: statusColor[room.status] }} />
            </div>
          ))}
        </div>
        <div className="legend">
          <div><span className="dot" style={{ backgroundColor: "limegreen" }} /> Normal</div>
          <div><span className="dot" style={{ backgroundColor: "gold" }} /> MT playing</div>
          <div><span className="dot" style={{ backgroundColor: "red" }} /> BPSD detected</div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
