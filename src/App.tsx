import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from '@/infrastructure/query';
import { AuthProvider } from '@/features/auth';
import { ToastContainer } from '@shared/components';
import router from '@/router';
import { useTheme } from '@/hooks/use-theme';

function App() {
  // Initialize theme
  useTheme();

  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastContainer />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
