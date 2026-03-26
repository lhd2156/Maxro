import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache, ApolloLink, Observable as ApolloObservable } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../../../environments/environment';

interface RefreshTokens {
  accessToken: string;
  refreshToken: string;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length < 2 || typeof atob !== 'function') {
    return null;
  }

  try {
    const base64 = segments[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(segments[1].length / 4) * 4, '=');

    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  const payload = parseJwtPayload(token);
  const expiresAt = typeof payload?.['exp'] === 'number'
    ? payload['exp'] * 1000
    : null;

  if (!expiresAt) {
    return false;
  }

  return expiresAt <= Date.now() + (bufferSeconds * 1000);
}

export function provideGraphQL(): EnvironmentProviders {
  return makeEnvironmentProviders([
    Apollo,
    HttpLink,
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink): ApolloClientOptions<unknown> => {
        const http = httpLink.create({ uri: environment.graphqlUrl });
        let refreshRequest: Promise<RefreshTokens | null> | null = null;

        const requestTokenRefresh = (refreshToken: string): Promise<RefreshTokens | null> => {
          if (!refreshRequest) {
            refreshRequest = fetch(environment.graphqlUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `mutation RefreshToken($token: String!) { refreshToken(token: $token) { accessToken refreshToken user { id email displayName } } }`,
                variables: { token: refreshToken },
              }),
            })
              .then(async response => {
                if (!response.ok) {
                  return null;
                }

                const result = await response.json();
                const payload = result?.data?.refreshToken;
                if (!payload?.accessToken || !payload?.refreshToken) {
                  return null;
                }

                localStorage.setItem('accessToken', payload.accessToken);
                localStorage.setItem('refreshToken', payload.refreshToken);
                return {
                  accessToken: payload.accessToken,
                  refreshToken: payload.refreshToken,
                };
              })
              .catch(() => null)
              .finally(() => {
                refreshRequest = null;
              });
          }

          return refreshRequest;
        };

        const auth = setContext((_, context) => {
          const token = localStorage.getItem('accessToken');
          return {
            headers: token && !isTokenExpired(token)
              ? { ...(context['headers'] ?? {}), Authorization: `Bearer ${token}` }
              : { ...(context['headers'] ?? {}) },
          };
        });

        const errorLink = onError(({ graphQLErrors, operation, forward }) => {
          const shouldRefresh = graphQLErrors?.some(error => error.message?.includes('Not authenticated') || error.message?.includes('Unauthorized'));
          if (!shouldRefresh) {
            return undefined;
          }

          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            return undefined;
          }

          return new ApolloObservable(observer => {
            let activeSubscription: { unsubscribe(): void } | null = null;

            void requestTokenRefresh(refreshToken)
              .then(tokens => {
                if (!tokens) {
                  observer.error(graphQLErrors?.[0] ?? new Error('Unauthorized'));
                  return;
                }

                const nextHeaders = operation.getContext()['headers'] ?? {};
                operation.setContext({
                  headers: {
                    ...nextHeaders,
                    Authorization: `Bearer ${tokens.accessToken}`,
                  },
                });

                activeSubscription = forward(operation).subscribe(observer);
              })
              .catch(() => {
                observer.error(graphQLErrors?.[0] ?? new Error('Unauthorized'));
              });

            return () => {
              activeSubscription?.unsubscribe();
            };
          });
        });

        return {
          link: ApolloLink.from([errorLink, auth, http]),
          cache: new InMemoryCache(),
          defaultOptions: {
            watchQuery: {
              fetchPolicy: 'cache-and-network',
              nextFetchPolicy: 'cache-first',
            },
            query: {
              fetchPolicy: 'cache-first',
            },
          },
        };
      },
      deps: [HttpLink],
    },
  ]);
}






