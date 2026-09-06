import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const container = document.getElementById('root')!;

/**
 * Start the application.
 *
 * `App` is imported dynamically so that a startup failure produces something
 * readable instead of a blank page. Configuration is checked while the module
 * graph is still being evaluated — before React ever mounts — so a React error
 * boundary cannot catch it. Without this, a misconfigured deployment shows the
 * visitor an empty white screen with the reason buried in the browser console,
 * which is the worst possible way to report a problem that takes one minute to
 * fix.
 */
async function start(): Promise<void> {
  try {
    const { default: App } = await import('./App');
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    showStartupFailure(error);
  }
}

/**
 * Painted with plain DOM on purpose: whatever failed may well be the reason
 * React cannot run, so this must not depend on anything the app imports.
 */
function showStartupFailure(error: unknown): void {
  const message =
    error instanceof Error ? error.message : 'The application could not be started.';

  container.innerHTML = '';

  const panel = document.createElement('div');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = [
    'max-width:44rem',
    'margin:12vh auto',
    'padding:1.75rem',
    'border:1px solid #e2e8f0',
    'border-radius:14px',
    'background:#fff',
    'color:#0f172a',
    'font:14px/1.65 system-ui,-apple-system,Segoe UI,sans-serif',
    'box-shadow:0 1px 3px rgba(15,23,42,.08)',
  ].join(';');

  const heading = document.createElement('h1');
  heading.textContent = 'This deployment is not configured yet';
  heading.style.cssText = 'margin:0 0 .6rem;font-size:1.05rem;font-weight:650';

  const detail = document.createElement('p');
  detail.textContent = message;
  detail.style.cssText = 'margin:0;color:#475569;white-space:pre-wrap';

  panel.append(heading, detail);
  container.append(panel);

  // Still surface it for anyone with the console open.
  console.error(error);
}

void start();
