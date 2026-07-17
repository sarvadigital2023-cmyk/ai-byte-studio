export type Accent = 'blue' | 'pink' | 'green' | 'yellow'

/** Full literal class names so Tailwind's JIT picks them up. */
export const ACCENT: Record<
  Accent,
  {
    text: string
    border: string
    bg: string
    shadow: string
    solid: string
    glass: string
    hex: string
  }
> = {
  blue: {
    text: 'text-neon-blue',
    border: 'border-neon-blue/50',
    bg: 'bg-neon-blue/10',
    shadow: 'shadow-glow-blue',
    solid: 'bg-neon-blue',
    glass: 'glass-glow-blue',
    hex: '#00D4FF',
  },
  pink: {
    text: 'text-neon-pink',
    border: 'border-neon-pink/50',
    bg: 'bg-neon-pink/10',
    shadow: 'shadow-glow-pink',
    solid: 'bg-neon-pink',
    glass: 'glass-glow-pink',
    hex: '#FF2D95',
  },
  green: {
    text: 'text-neon-green',
    border: 'border-neon-green/50',
    bg: 'bg-neon-green/10',
    shadow: 'shadow-glow-green',
    solid: 'bg-neon-green',
    glass: 'glass-glow-green',
    hex: '#39FF88',
  },
  yellow: {
    text: 'text-neon-yellow',
    border: 'border-neon-yellow/50',
    bg: 'bg-neon-yellow/10',
    shadow: 'shadow-glow-yellow',
    solid: 'bg-neon-yellow',
    glass: 'glass-glow-yellow',
    hex: '#F5FF3D',
  },
}
