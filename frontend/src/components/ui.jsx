export function Spinner({ label = 'Загрузка…' }) {
  return (
    <div className="spinner-box">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null
  return <div className={`alert alert-${kind}`}>{children}</div>
}

export function EmptyState({ icon = '🔍', title, hint, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  )
}

export function StatusBadge({ value, labels }) {
  const cls = String(value || '').toLowerCase()
  return <span className={`badge badge-${cls}`}>{labels?.[value] || value}</span>
}

export function Pagination({ page, totalPages, totalElements, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  return (
    <div className="pagination">
      <button className="btn btn-ghost" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        ← Назад
      </button>
      <span className="pagination-info">
        Страница {page + 1} из {totalPages} · всего {totalElements}
      </span>
      <button className="btn btn-ghost" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
        Вперёд →
      </button>
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
