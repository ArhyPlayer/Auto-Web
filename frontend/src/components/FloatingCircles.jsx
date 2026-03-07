export function FloatingCircles() {
  const circles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 80 + Math.random() * 120,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 15 + Math.random() * 20,
  }))

  return (
    <div className="floating-circles" aria-hidden="true">
      {circles.map(({ id, size, left, top, delay, duration }) => (
        <div
          key={id}
          className="circle"
          style={{
            width: size,
            height: size,
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      ))}
    </div>
  )
}
