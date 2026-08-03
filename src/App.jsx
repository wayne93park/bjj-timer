import './App.css'
import logo from './assets/bjj_timer_logo.png'
import Clock from './components/Clock'
import Timer from './components/Timer'

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <img src={logo} alt="BJJ Timer logo" className="gym-logo" />
        <Clock />
      </aside>
      <Timer />
    </div>
  )
}

export default App
