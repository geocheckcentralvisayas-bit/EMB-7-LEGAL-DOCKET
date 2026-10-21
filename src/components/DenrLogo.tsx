import denrLogo from '../../assets/denr-logo-512.png'
import { classNames } from '../lib/utils'

const SIZES = {
  sm: 'h-9 w-9 p-[2px]',
  md: 'h-11 w-11 p-[3px]',
  lg: 'h-14 w-14 p-[3px]',
  xl: 'h-16 w-16 p-1',
}

export function DenrLogo({
  size = 'md',
  className,
  glow = true,
}: {
  size?: keyof typeof SIZES
  className?: string
  glow?: boolean
}) {
  return (
    <span
      className={classNames(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-lg shadow-brand-950/25 ring-1 ring-white/70',
        SIZES[size],
        className,
      )}
    >
      {glow ? (
        <span
          aria-hidden="true"
          className="denr-logo-halo pointer-events-none absolute -inset-1.5 rounded-full bg-brand-300/35 blur-md"
        />
      ) : null}
      <span className="denr-logo-float relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
        <img
          src={denrLogo}
          alt="DENR"
          draggable={false}
          className="h-full w-full rounded-full object-cover"
        />
        <span aria-hidden="true" className="denr-logo-sheen" />
      </span>
    </span>
  )
}
