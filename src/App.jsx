import './App.css'
import logo from './assets/gym_logo.webp'
import Clock from './components/Clock'
import Timer from './components/Timer'

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <img src={logo} alt="King Jiu Jitsu logo" className="gym-logo" />
        <Clock />
      </aside>
      <main className="main">
        <Timer />
      </main>
    </div>
  )
}

export default App
