export const environment = {
  production: false,
  googleApi: {
    // Configuration depuis le fichier .env
    // Remplacez ces valeurs par vos vraies clés Google
    apiKey: '',  // Votre API Key Google
    clientId: '',  // Votre Client ID Google
    spreadsheetId: '',  // ID de votre Google Spreadsheet

    // Configuration de l'API
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly'
  }
};
