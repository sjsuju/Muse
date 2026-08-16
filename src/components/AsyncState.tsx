export function LoadingGrid() {
  return <div className="media-grid" aria-label="Loading collection">{Array.from({ length: 8 }, (_, index) => <div className="media-skeleton" key={index} />)}</div>
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><h2>{title}</h2><p>{body}</p></div>
}
