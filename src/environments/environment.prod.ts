export const environment = {
  production: true,
  googleApi: {
    // En production, utilisez des variables d'environnement injectées lors du build
    // ou un service de gestion de secrets
    apiKey: '',  // Votre API Key Google
    clientId: '',  // Votre Client ID Google
    spreadsheetId: '',  // ID de votre Google Spreadsheet

    // Configuration de l'API
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly'
  }
};
