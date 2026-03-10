export const environment = {
  production: false,
  // Use full backend URL in dev so GraphQL works even without proxy; backend CORS allows localhost:4200
  graphqlUrl: 'http://localhost:8080/graphql',
  // Get from https://console.cloud.google.com/apis/credentials → Create OAuth client ID (Web app)
  // Add http://localhost:4200 to Authorized JavaScript origins
  googleClientId: '',
};
