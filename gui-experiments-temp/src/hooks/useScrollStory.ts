import { useEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type ScrollStoryState = {
  activeChapter: number
  progressRef: React.MutableRefObject<number>
}

function chapterFromProgress(progress: number): number {
  if (progress < 0.45) return 0
  if (progress < 0.82) return 1
  return 2
}

export function useScrollStory(
  sectionRef: RefObject<HTMLElement | null>,
  reducedMotion: boolean,
): ScrollStoryState {
  const progressRef = useRef(reducedMotion ? 1 : 0)
  const [activeChapter, setActiveChapter] = useState(reducedMotion ? 2 : 0)

  useEffect(() => {
    if (reducedMotion) {
      progressRef.current = 1
      setActiveChapter(2)
      return
    }

    const section = sectionRef.current
    if (!section) return

    progressRef.current = 0
    setActiveChapter(0)

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: ({ progress }) => {
          progressRef.current = progress
          const nextChapter = chapterFromProgress(progress)
          setActiveChapter((current) =>
            current === nextChapter ? current : nextChapter,
          )
        },
      })
    }, section)

    return () => context.revert()
  }, [reducedMotion, sectionRef])

  return { activeChapter, progressRef }
}
