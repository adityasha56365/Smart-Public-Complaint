import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: 32,
            margin: "24px auto",
            maxWidth: 600,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              fontSize: 24,
            }}
          >
            !
          </div>
          <h3 style={{ fontSize: 18, color: "#0f172a", margin: "0 0 8px" }}>
            Something went wrong
          </h3>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
            {this.state.error?.message || "An unexpected error occurred while displaying this page."}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={this.handleReset}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "0 auto" }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
