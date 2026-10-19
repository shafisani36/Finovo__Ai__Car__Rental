import { SmoothScrollProvider } from './app/providers/SmoothScrollProvider';
import { ConfirmProvider } from './components/common/ConfirmModal';
import { AppRouter } from './app/router/AppRouter';

export function App() {
  return (
    <SmoothScrollProvider>
      <ConfirmProvider>
        <AppRouter />
      </ConfirmProvider>
    </SmoothScrollProvider>
  );
}

export default App;

