/**
 * Types for Google API and Google Sheets
 */

export interface GoogleAPI {
  accounts: {
    oauth2: {
      initTokenClient(config: TokenClientConfig): TokenClient;
      revoke(accessToken: string, callback: () => void): void;
    };
  };
}

export interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
}

export interface TokenResponse {
  access_token: string;
  expires_in?: number;
  error?: string;
}

export interface TokenClient {
  callback: (response: TokenResponse) => void;
  requestAccessToken: (options: { prompt: string }) => void;
}

export interface GoogleSheetsValueRange {
  values: (string | number)[][];
  range: string;
}

export interface GoogleSheetsMetadata {
  sheets?: GoogleSheet[];
  properties?: {
    title: string;
    locale: string;
    timeZone: string;
  };
}

export interface GoogleSheet {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    sheetType: string;
    hidden?: boolean;
  };
}

export interface GoogleSheetsValuesResponse {
  result: {
    values?: (string | number)[][];
  };
}

export interface GoogleSheetsBatchGetResponse {
  result: {
    valueRanges: GoogleSheetsValueRange[];
  };
}

export interface GoogleSheetsMetadataResponse {
  result: GoogleSheetsMetadata;
}

declare global {
  interface Window {
    google: GoogleAPI;
  }
}
