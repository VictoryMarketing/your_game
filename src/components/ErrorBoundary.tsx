import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppCrashScreen } from "../screens/AppCrashScreen";

type Props = {
  children: ReactNode;
};

type State = {
  error?: Error;
  errorId?: string;
};

function makeErrorId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error, errorId: makeErrorId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      errorId: this.state.errorId,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <AppCrashScreen
          title="Игра не смогла открыться"
          message="Произошла ошибка интерфейса. Перезапустите приложение или попробуйте ещё раз."
          errorId={this.state.errorId}
          onRetry={() => this.setState({ error: undefined, errorId: undefined })}
        />
      );
    }
    return this.props.children;
  }
}
