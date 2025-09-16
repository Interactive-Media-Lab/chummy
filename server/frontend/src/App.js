import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SingleVersion from './pages/ChummyCombined';

const App = () => {
  return (
    <div>
      <SingleVersion audioSrc='./audio.mp3' />
    </div>
  );
}


export default App;
