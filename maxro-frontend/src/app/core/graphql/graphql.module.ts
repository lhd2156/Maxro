import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache, ApolloLink, Observable as ApolloObservable } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../../../environments/environment';

export function provideGraphQL(): EnvironmentProviders {
  return makeEnvironmentProviders([
    Apollo,
    HttpLink,
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink): ApolloClientOptions<unknown> => {
        const http = httpLink.create({ uri: environment.graphqlUrl });

        const auth = setContext(() => {
          const token = localStorage.getItem('accessToken');
          if (!token) return {};
          return { headers: { Authorization: `Bearer ${token}` } };
        });

        const errorLink = onError(({ graphQLErrors, operation, forward }) => {
          if (graphQLErrors?.some(e => e.message?.includes('Not authenticated') || e.message?.includes('Unauthorized'))) {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              return new ApolloObservable((observer: any) => {
                fetch(environment.graphqlUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    query: `mutation RefreshToken($token: String!) { refreshToken(token: $token) { accessToken refreshToken user { id email displayName } } }`,
                    variables: { token: refreshToken },
                  }),
                })
                .then(r => r.json())
                .then(result => {
                  if (result.data?.refreshToken) {
                    const payload = result.data.refreshToken;
                    localStorage.setItem('accessToken', payload.accessToken);
                    localStorage.setItem('refreshToken', payload.refreshToken);
                    operation.setContext({
                      headers: { Authorization: `Bearer ${payload.accessToken}` },
                    });
                    forward(operation).subscribe(observer);
                  } else {
                    observer.error(graphQLErrors?.[0]);
                  }
                })
                .catch(() => observer.error(graphQLErrors?.[0]));
              });
            }
          }
          return undefined;
        });

        return {
          link: ApolloLink.from([errorLink, auth, http]),
          cache: new InMemoryCache(),
          defaultOptions: {
            watchQuery: { fetchPolicy: 'network-only' },
            query: { fetchPolicy: 'network-only' },
          },
        };
      },
      deps: [HttpLink],
    },
  ]);
}
