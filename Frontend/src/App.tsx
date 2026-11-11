import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import { SmoothScrollProvider } from './app/providers/SmoothScrollProvider';
import { ConfirmProvider } from './components/common/ConfirmModal';
import { DynamicErrorBoundary } from './components/common/DynamicErrorBoundary';
import { AppRouter } from './app/router/AppRouter';

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <DynamicErrorBoundary>
        <SmoothScrollProvider>
          <ConfirmProvider>
            <AppRouter />
          </ConfirmProvider>
        </SmoothScrollProvider>
      </DynamicErrorBoundary>
    </I18nextProvider>
  );
}

export default App;
