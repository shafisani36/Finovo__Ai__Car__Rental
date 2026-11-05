import { SmoothScrollProvider } from './app/providers/SmoothScrollProvider';
import { ConfirmProvider } from './components/common/ConfirmModal';
import { DynamicErrorBoundary } from './components/common/DynamicErrorBoundary';
import { AppRouter } from './app/router/AppRouter';

export function App() {
  return (
    <DynamicErrorBoundary>
      <SmoothScrollProvider>
        <ConfirmProvider>
          <AppRouter />
        </ConfirmProvider>
      </SmoothScrollProvider>
    </DynamicErrorBoundary>
  );
}

export default App;
