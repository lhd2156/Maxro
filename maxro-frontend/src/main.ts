import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

function markAppReady(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.classList.add('app-ready');
  window.setTimeout(() => {
    document.getElementById('app-boot-splash')?.remove();
  }, 350);
}

function markAppFailed(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const message = document.querySelector<HTMLElement>('[data-boot-message]');
  if (message) {
    message.textContent = 'Maxro hit a startup issue. Please refresh to try again.';
  }
}

const currentUrl = typeof window !== 'undefined' ? new URL(window.location.href) : null;
const shouldRedirectToLoopback = !!currentUrl
  && currentUrl.protocol === 'http:'
  && currentUrl.hostname === 'localhost'
  && currentUrl.port === '4200';

if (shouldRedirectToLoopback && currentUrl) {
  currentUrl.hostname = '127.0.0.1';
  window.location.replace(currentUrl.toString());
} else {
  bootstrapApplication(AppComponent, appConfig)
    .then(() => markAppReady())
    .catch((err) => {
      markAppFailed();
      console.error(err);
    });
}
