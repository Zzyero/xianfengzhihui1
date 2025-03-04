import type { AppProps } from 'next/app';
import { ThemeProvider } from '@/components/theme-provider';
import { TopNav } from '@/components/top-nav';
import '@/styles.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        <TopNav />
        <main>
          <Component {...pageProps} />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default MyApp;
