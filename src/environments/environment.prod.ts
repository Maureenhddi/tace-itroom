export const environment = {
  production: true,
  googleApi: {
    // Configuration de production
    apiKey: 'AIzaSyCWSYoObg4h2rePoGDw5dIayNYA4KSeyNM',  // Votre API Key Google
    clientId: '29902689115-jv17hmg4mhtj5mhshtcdvbd39f6n7esj.apps.googleusercontent.com',  // Votre Client ID Google
    spreadsheetId: '1TEVv7H7VlKigfLFgi2atOnCfPf3E91GCZAf-n4MfIGs',  // ID de votre Google Spreadsheet

    // Configuration de l'API
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly'
  }
};
