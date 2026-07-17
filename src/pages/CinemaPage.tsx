import { CastStudio } from '@/components/characters/CastStudio'
import { useCinemaStore } from '@/store/cast'

export function CinemaPage() {
  return <CastStudio kind="cinema" accent="pink" useStore={useCinemaStore} />
}
