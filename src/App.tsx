import { Component } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

interface State {
  hasError: boolean
  error: Error | null
}

export class App extends Component<object, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell p-6 text-center py-20">
          <p className="text-xl font-bold text-text mb-2">出错了</p>
          <p className="text-text-secondary mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-6 py-2 bg-accent text-white rounded-xl"
          >
            重新加载
          </button>
        </div>
      )
    }

    return <RouterProvider router={router} />
  }
}
