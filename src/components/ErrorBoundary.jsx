import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          background: '#F8FAFC',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          margin: '2rem auto',
          maxWidth: '600px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            marginBottom: '1rem'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '420px' }}>
            An unexpected error occurred while rendering this section.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#8B0000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
