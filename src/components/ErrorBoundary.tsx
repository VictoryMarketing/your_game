import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppCrashScreen } from "../screens/AppCrashScreen";
import { BUILD_ID } from "../config/runtime";

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
    if (/dynamically imported module|loading chunk|chunkloaderror|module script failed/i.test(error.message)) {
      const key = `yougame_boundary_chunk_reload_${BUILD_ID}`;
      if (sessionStorage.getItem(key) !== "1") {
        sessionStorage.setItem(key, "1");
        const url = new URL(window.location.href);
        url.searchParams.set("build", BUILD_ID.slice(0, 12));
        window.location.replace(url.toString());
      }
    }
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
