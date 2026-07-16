import { lazy, Suspense, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useScrollStory } from '../hooks/useScrollStory'

const IngredientScene = lazy(() =>
  import('./IngredientScene').then(({ IngredientScene: Scene }) => ({
    default: Scene,
  })),
)

const chapters = [
  {
    kicker: 'Ingredient 01',
    title: 'First green',
    description:
      'Whole green leaves arrive first—light, grassy and slow enough to show their shape before slipping beneath the water.',
  },
  {
    kicker: 'Ingredient 02',
    title: 'Second harvest',
    description:
      'A finer tea follows with a quicker rhythm, adding another aromatic layer as the infusion begins to change.',
  },
  {
    kicker: 'The blend',
    title: 'A gentle infusion',
    description:
      'The leaves disappear below the surface while the water settles into a soft yellow-green cup of tea.',
  },
] as const

export function IngredientStory() {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { activeChapter, progressRef } = useScrollStory(
    sectionRef,
    reducedMotion,
  )

  return (
    <section
      ref={sectionRef}
      className="ingredientStory"
      aria-label="A scroll-controlled ingredient blend"
    >
      <div className="storyStage">
        <div className="sceneColumn" aria-hidden="true">
          <div className="sceneGlow" />
          <Suspense fallback={<div className="sceneLoading">Preparing ingredients</div>}>
            <IngredientScene
              progressRef={progressRef}
              reducedMotion={reducedMotion}
            />
          </Suspense>
          <span className="bowlLabel">A reversible infusion study</span>
        </div>

        <div className="copyColumn">
          <p className="storyIndex">Blend study / 001</p>
          <div className="chapterStack" aria-live="polite">
            {chapters.map((chapter, index) => {
              const isActive = activeChapter === index

              return (
                <article
                  className={`chapterCard${isActive ? ' isActive' : ''}`}
                  aria-hidden={!isActive}
                  key={chapter.kicker}
                >
                  <p className="chapterKicker">{chapter.kicker}</p>
                  <h2>{chapter.title}</h2>
                  <p>{chapter.description}</p>
                </article>
              )
            })}
          </div>

          <div className="chapterProgress" aria-hidden="true">
            {chapters.map((chapter, index) => (
              <span
                className={index === activeChapter ? 'isActive' : ''}
                key={chapter.kicker}
              />
            ))}
          </div>
        </div>

        <p className="scrollCue" aria-hidden="true">
          <span /> Scroll to blend
        </p>
      </div>
    </section>
  )
}
