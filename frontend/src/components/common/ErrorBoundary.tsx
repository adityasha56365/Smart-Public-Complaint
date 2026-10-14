import React, { Component, ErrorInfo, ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#f7f8f5",
            color: "#17324d",
            fontFamily: "'Manrope', system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "32px 24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 10px 30px rgba(23, 50, 77, 0.08)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#fee2e2",
                color: "#dc2626",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Icon name="alert" size={24} />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 8px" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
              The application encountered an unexpected error. Please refresh the page to continue.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              style={{
                width: "100%",
                minHeight: "42px",
                borderRadius: "10px",
                background: "#087f8c",
                color: "#ffffff",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
