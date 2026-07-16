import { IngredientStory } from './components/IngredientStory'
import './App.css'

export function App() {
  return (
    <main>
      <header className="intro">
        <nav className="topbar" aria-label="Prototype information">
          <span>GUI experiments</span>
          <span>Prototype 01</span>
        </nav>
        <div className="introContent">
          <p className="eyebrow">Scroll-directed ingredients</p>
          <h1>Can a recipe tell its own story?</h1>
          <p className="introLede">
            A first technical sketch for tea leaves, spices and everything that
            happens as they meet.
          </p>
        </div>
        <a className="jumpLink" href="#experiment">
          Enter experiment <span aria-hidden="true">↘</span>
        </a>
      </header>

      <div id="experiment">
        <IngredientStory />
      </div>

      <section className="outro" aria-labelledby="outro-title">
        <p className="eyebrow">What this version tests</p>
        <h2 id="outro-title">Motion before polish.</h2>
        <div className="outroGrid">
          <p>Deterministic particles that remain exact when scrolling backwards.</p>
          <p>HTML storytelling timed against a lightweight real-time 3D scene.</p>
          <p>A shared mechanism that can later become botanical or culinary.</p>
        </div>
      </section>
    </main>
  )
}
