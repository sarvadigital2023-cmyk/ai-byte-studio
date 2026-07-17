import { CastStudio } from '@/components/characters/CastStudio'
import { useCartoonStore } from '@/store/cast'

export function CartoonPage() {
  return <CastStudio kind="cartoon" accent="green" useStore={useCartoonStore} />
}
