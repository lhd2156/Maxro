import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

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
    .catch((err) => console.error(err));
}
