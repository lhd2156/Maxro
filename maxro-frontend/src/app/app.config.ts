import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';
import { provideGraphQL } from './core/graphql/graphql.module';
import { IconRegistryService } from './core/services/icon-registry.service';

function initializeIcons(iconRegistry: IconRegistryService): () => void {
  return () => iconRegistry.registerAll();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    provideGraphQL(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeIcons,
      deps: [IconRegistryService],
      multi: true,
    },
  ],
};
