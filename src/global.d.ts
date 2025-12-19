export {};

declare global {
  interface Window {
    CLIC_AUTH?: {
      rest_root: string;
      nonce: string;
      logged_in: boolean;
      logout_url: string;
      version?: string;
      // campos extras podem existir via filtros
      [key: string]: any;
    };

    CLIC_CHATBOT?: {
      rest_root: string;
      app_url: string;
      [key: string]: any; // se no futuro quiser incluir mais campos
    };
  }
}