export const environment = {
  production: false,
  googleApi: {
    // Configuration depuis le fichier .env
    // En développement, remplacez ces valeurs par vos vraies clés
    // ou utilisez un système de build pour injecter les variables d'environnement
    apiKey: 'AIzaSyCWSYoObg4h2rePoGDw5dIayNYA4KSeyNM',  // Votre API Key Google
    clientId: '29902689115-jv17hmg4mhtj5mhshtcdvbd39f6n7esj.apps.googleusercontent.com',  // Votre Client ID Google
    spreadsheetId: '1TEVv7H7VlKigfLFgi2atOnCfPf3E91GCZAf-n4MfIGs',  // ID du Google Spreadsheet source (données brutes)

    // Configuration de l'API
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly'
  }
};
