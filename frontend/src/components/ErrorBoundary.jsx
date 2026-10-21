import { Component } from 'react'

/**
 * Catches render/runtime errors inside its subtree so a single broken page
 * never unmounts the whole app into a blank white screen. Shows a friendly
 * card with the error and a way out instead.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface in the console for debugging; harmless for users.
    console.error('ErrorBoundary поймал ошибку:', error, info?.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="container section">
        <div className="empty-state error-boundary">
          <div className="empty-icon">⚠️</div>
          <h3>Что-то пошло не так</h3>
          <p>
            Эта часть приложения не смогла загрузиться. Попробуйте обновить страницу — обычно этого
            достаточно.
          </p>
          <details className="error-details">
            <summary>Технические детали</summary>
            <pre>{String(error?.message || error)}</pre>
          </details>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={this.handleReload}>
              Обновить страницу
            </button>
            <button className="btn btn-ghost" onClick={this.handleReset}>
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    )
  }
}
