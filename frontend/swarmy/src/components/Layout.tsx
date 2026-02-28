interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="page">
      <header className="header">
        <h1 className="header-label">Swarm</h1>
        <div className="header-title">AI Democracy</div>
        <p className="header-subtitle">
          Spawn a swarm of agents, send the same prompt, and see if consensus emerges.
        </p>
      </header>
      {children}
    </div>
  )
}
