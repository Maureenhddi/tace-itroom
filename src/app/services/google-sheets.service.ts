import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { gapi } from 'gapi-script';
import {
  TokenResponse,
  TokenClient,
  GoogleSheetsMetadata,
  GoogleSheet
} from '../models/google-api.types';
import { ConfigService } from './config.service';

declare const google: Window['google'];

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsService {
  private gapiInitialized = false;
  private tokenClient: TokenClient | null = null;
  private accessToken: string | null = null;
  private readonly TOKEN_STORAGE_KEY = 'google_access_token';
  private readonly TOKEN_EXPIRY_KEY = 'google_token_expiry';

  constructor(private configService: ConfigService) {
    // Restaurer le token depuis le localStorage au démarrage
    this.loadTokenFromStorage();
  }

  /**
   * Load token from localStorage if still valid
   */
  private loadTokenFromStorage(): void {
    const storedToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

    if (storedToken && expiryTime) {
      const expiry = parseInt(expiryTime, 10);
      const now = Date.now();

      // Vérifier si le token n'a pas expiré (avec une marge de 5 minutes)
      if (expiry > now + 5 * 60 * 1000) {
        this.accessToken = storedToken;
      } else {
        // Token expiré, le supprimer
        this.clearTokenStorage();
      }
    }
  }

  /**
   * Save token to localStorage
   */
  private saveTokenToStorage(token: string, expiresIn: number = 3600): void {
    const expiryTime = Date.now() + expiresIn * 1000;
    localStorage.setItem(this.TOKEN_STORAGE_KEY, token);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Clear token from localStorage
   */
  private clearTokenStorage(): void {
    localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Initialize the Google API client using environment configuration
   */
  initClient(): Observable<void> {
    return from(
      new Promise<void>((resolve, reject) => {
        if (!environment.googleApi.apiKey || !environment.googleApi.clientId) {
          reject(new Error('Google API credentials not configured in environment'));
          return;
        }

        // Initialiser gapi
        gapi.load('client', async () => {
          try {
            await gapi.client.init({
              apiKey: environment.googleApi.apiKey,
              discoveryDocs: environment.googleApi.discoveryDocs,
            });

            // Initialiser le Token Client pour OAuth 2.0
            this.tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: environment.googleApi.clientId,
              scope: environment.googleApi.scopes,
              callback: (response: TokenResponse) => {
                if (response.error !== undefined) {
                  return;
                }
                this.accessToken = response.access_token;
                // Sauvegarder le token (expire dans 3600 secondes = 1 heure)
                this.saveTokenToStorage(response.access_token, response.expires_in || 3600);
              },
            });

            this.gapiInitialized = true;

            // Si un token a été restauré, le configurer dans gapi
            if (this.accessToken) {
              gapi.client.setToken({ access_token: this.accessToken });
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        });
      })
    );
  }

  /**
   * Sign in the user (request access token)
   */
  signIn(): Observable<TokenResponse> {
    return from(
      new Promise<TokenResponse>((resolve, reject) => {
        if (!this.gapiInitialized) {
          reject(new Error('Google API client not initialized'));
          return;
        }

        if (!this.tokenClient) {
          reject(new Error('Token client not initialized'));
          return;
        }

        // Callback temporaire pour cette requête spécifique
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (response: TokenResponse) => {
          if (response.error !== undefined) {
            reject(response);
          } else {
            this.accessToken = response.access_token;
            // Sauvegarder le token
            this.saveTokenToStorage(response.access_token, response.expires_in || 3600);
            gapi.client.setToken({ access_token: this.accessToken! });
            resolve(response);
          }
          // Restaurer le callback original
          if (this.tokenClient) {
            this.tokenClient.callback = originalCallback;
          }
        };

        // Demander un token
        this.tokenClient.requestAccessToken({ prompt: '' });
      })
    );
  }

  /**
   * Sign out the user
   */
  signOut(): Observable<boolean> {
    return from(
      new Promise<boolean>((resolve) => {
        if (this.accessToken) {
          google.accounts.oauth2.revoke(this.accessToken, () => {});
        }
        this.accessToken = null;
        // Supprimer le token du localStorage
        this.clearTokenStorage();
        gapi.client.setToken(null);
        resolve(true);
      })
    );
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Get values from a spreadsheet
   * @param spreadsheetId - The ID of the spreadsheet
   * @param range - The A1 notation of the range to retrieve (e.g., 'Sheet1!A1:D10')
   */
  getSpreadsheetValues(spreadsheetId: string, range: string): Observable<(string | number)[][]> {
    if (!this.gapiInitialized) {
      throw new Error('Google API client not initialized');
    }

    if (!this.accessToken) {
      throw new Error('User not signed in');
    }

    interface GapiSheetsResponse {
      result: {
        values?: (string | number)[][];
      };
    }

    const promise: Promise<(string | number)[][]> = (gapi.client as any).sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
      valueRenderOption: 'UNFORMATTED_VALUE'
    }).then((response: GapiSheetsResponse): (string | number)[][] => {
      return response.result.values || [];
    });

    return from(promise);
  }

  /**
   * Get multiple ranges from a spreadsheet
   * @param spreadsheetId - The ID of the spreadsheet
   * @param ranges - Array of ranges in A1 notation
   */
  getMultipleRanges(spreadsheetId: string, ranges: string[]): Observable<Array<{values: (string | number)[][], range: string}>> {
    if (!this.gapiInitialized) {
      throw new Error('Google API client not initialized');
    }

    if (!this.accessToken) {
      throw new Error('User not signed in');
    }

    interface GapiBatchGetResponse {
      result: {
        valueRanges: Array<{values: (string | number)[][], range: string}>;
      };
    }

    const promise: Promise<Array<{values: (string | number)[][], range: string}>> = (gapi.client as any).sheets.spreadsheets.values.batchGet({
      spreadsheetId: spreadsheetId,
      ranges: ranges
    }).then((response: GapiBatchGetResponse) => {
      return response.result.valueRanges;
    });

    return from(promise);
  }

  /**
   * Get spreadsheet metadata
   * @param spreadsheetId - The ID of the spreadsheet
   */
  getSpreadsheetMetadata(spreadsheetId: string): Observable<GoogleSheetsMetadata> {
    if (!this.gapiInitialized) {
      throw new Error('Google API client not initialized');
    }

    if (!this.accessToken) {
      throw new Error('User not signed in');
    }

    interface GapiMetadataResponse {
      result: GoogleSheetsMetadata;
    }

    const promise: Promise<GoogleSheetsMetadata> = (gapi.client as any).sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    }).then((response: GapiMetadataResponse) => {
      return response.result;
    });

    return from(promise);
  }

  /**
   * Get list of all sheet names from a spreadsheet
   * @param spreadsheetId - The ID of the spreadsheet
   */
  getSheetNames(spreadsheetId: string): Observable<string[]> {
    return this.getSpreadsheetMetadata(spreadsheetId).pipe(
      map((metadata: GoogleSheetsMetadata) => {
        if (metadata.sheets) {
          // Filtrer les onglets masqués (hidden: true) et ne retourner que les onglets visibles
          return metadata.sheets
            .filter(sheet => !sheet.properties.hidden)
            .map(sheet => sheet.properties.title);
        }
        return [];
      })
    );
  }

  /**
   * Get list of all sheet names from the default spreadsheet
   */
  getDefaultSheetNames(): Observable<string[]> {
    const spreadsheetId = this.getDefaultSpreadsheetId();
    return this.getSheetNames(spreadsheetId);
  }

  /**
   * Extract spreadsheet ID from a Google Sheets URL
   * @param url - Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...)
   * @returns The extracted spreadsheet ID or empty string if not found
   */
  private extractSpreadsheetIdFromUrl(url: string): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  }

  /**
   * Get the default spreadsheet ID from ConfigService (with fallback to environment)
   */
  getDefaultSpreadsheetId(): string {
    const configUrl = this.configService.getPlanChargeUrl();
    const spreadsheetId = this.extractSpreadsheetIdFromUrl(configUrl);

    // Fallback to environment if extraction fails
    return spreadsheetId || environment.googleApi.spreadsheetId || '';
  }

  /**
   * Get values from the default spreadsheet configured in environment
   * @param range - The A1 notation of the range to retrieve (e.g., 'Sheet1!A1:D10')
   */
  getDefaultSpreadsheetValues(range: string): Observable<(string | number)[][]> {
    const spreadsheetId = this.getDefaultSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error('Default spreadsheet ID not configured in environment');
    }
    return this.getSpreadsheetValues(spreadsheetId, range);
  }
}
