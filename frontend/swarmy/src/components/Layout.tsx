interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="page">
      <header className="header">
        <div className="header-accent" aria-hidden="true" />
        <div className="header-content">
          <div className="header-badge">
            <span className="header-badge-dot" />
            <span className="header-badge-text">Swarm</span>
          </div>
          <h1 className="header-title">
            <span className="header-title-gradient">AI Democracy</span>
          </h1>
          <p className="header-subtitle">
            Spawn a swarm of agents, send the same prompt, and see if consensus emerges.
          </p>
        </div>
        <div className="header-rule" aria-hidden="true" />
      </header>
      {children}
    </div>
  )
}
