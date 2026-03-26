import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';
import { provideGraphQL } from './core/graphql/graphql.module';
import { AuthService } from './core/services/auth.service';
import { IconRegistryService } from './core/services/icon-registry.service';
import { PublicConfigService } from './core/services/public-config.service';

function initializeIcons(iconRegistry: IconRegistryService): () => void {
  return () => iconRegistry.registerAll();
}

function warmPublicConfig(publicConfigService: PublicConfigService): () => void {
  return () => {
    void publicConfigService.load();
  };
}

function warmAuthSession(authService: AuthService): () => void {
  return () => {
    authService.warmSession();
  };
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
    {
      provide: APP_INITIALIZER,
      useFactory: warmPublicConfig,
      deps: [PublicConfigService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: warmAuthSession,
      deps: [AuthService],
      multi: true,
    },
  ],
};
