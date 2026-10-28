"use client"

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

/**
 * Lays its children out at a fixed design size and scales them to whatever
 * width the stage is given. The app previews are drawn at the size the real
 * screens are, so their type and spacing stay honest at every width.
 */
export function ScaledStage({
  width,
  height,
  className,
  children,
}: {
  width: number
  height: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setScale(element.clientWidth / width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [width])

  return (
    <div
      ref={ref}
      className={`lm-stage ${className ?? ""}`}
      style={{ aspectRatio: `${width} / ${height}` } as CSSProperties}
    >
      <div
        className="lm-stage-inner"
        style={{ width, height, transform: `scale(${scale})`, visibility: scale ? undefined : "hidden" }}
      >
        {children}
      </div>
    </div>
  )
}
