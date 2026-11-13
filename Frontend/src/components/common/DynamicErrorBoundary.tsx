import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { RotateCcw, Home, ChevronDown, ChevronUp, Bug, ShieldAlert } from 'lucide-react';
import { reportError } from '../../utils/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class DynamicErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[DynamicErrorBoundary Caught Exception]:', error, errorInfo);
    reportError(error, { componentStack: errorInfo.componentStack, path: window.location.pathname });
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected application exception occurred.';
      const componentStack = this.state.errorInfo?.componentStack;

      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            backgroundColor: '#F9F8FA',
            fontFamily: 'var(--font-family-sans, "Manrope", sans-serif)',
          }}
        >
          <div
            style={{
              maxWidth: '620px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '36px',
              border: '1px solid #ECEAEF',
              boxShadow: '0 10px 30px rgba(30, 4, 38, 0.08)',
              textAlign: 'center',
            }}
          >
            {/* Warning Shield Icon */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <ShieldAlert size={36} />
            </div>

            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                marginBottom: '12px',
              }}
            >
              DYNAMIC FALLBACK EXCEPTION SHIELD
            </span>

            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1E0426',
                margin: '0 0 10px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Something Went Wrong
            </h2>

            <p
              style={{
                color: '#685D73',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                margin: '0 0 24px 0',
              }}
            >
              {errorMessage}
            </p>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#1E0426',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(30, 4, 38, 0.2)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#FAF9FB',
                  color: '#1E0426',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: '1px solid #ECEAEF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <Home size={16} />
                <span>Return to Home</span>
              </button>
            </div>

            {/* Collapsible Diagnostics */}
            <div
              style={{
                borderTop: '1px solid #F3F4F6',
                paddingTop: '16px',
                textAlign: 'left',
              }}
            >
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#685D73',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                <Bug size={14} />
                <span>{this.state.showDetails ? 'Hide technical diagnostics' : 'Show technical diagnostics'}</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '14px',
                    backgroundColor: '#1E0426',
                    color: '#E5E7EB',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4',
                  }}
                >
                  <div style={{ color: '#FAB826', marginBottom: '6px' }}>
                    Error: {this.state.error?.toString()}
                  </div>
                  {componentStack || 'No component stack trace available.'}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
