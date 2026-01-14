import { reactive } from 'vue';

type MeResponse = {
  logged_in: boolean;
  id?: number;
  name?: string;
  email?: string;
  // campos extras podem existir no futuro
  [key: string]: any;
};

const state = reactive({
  ready: false,       // já fez a checagem inicial
  loggedIn: false,
  id: 0,
  name: '',
  email: '',
  error: '' as string | null,
});

export async function checkLogin(): Promise<MeResponse> {
  const auth = typeof window !== 'undefined' ? window.CLIC_AUTH : undefined;
  const isWP = !!auth;

  // --- 1. Fora do WordPress (GitHub Pages) ---
  if (!isWP) {
    state.ready = true;
    state.loggedIn = false;
    return { logged_in: false };
  }

  // --- 2. Está no WordPress: seguir fluxo normal ---
  const root = auth.rest_root;
  const nonce = auth.nonce;

  try {
    const res = await fetch(root + 'me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-WP-Nonce': nonce, // ESSENCIAL
      },
    });

    if (!res.ok) {
      state.error = `HTTP ${res.status}`;
      state.ready = true;
      state.loggedIn = false;
      return { logged_in: false };
    }

    const data = (await res.json()) as MeResponse;

    state.loggedIn = !!data.logged_in;

    if (data.logged_in) {
      state.id = data.id ?? 0;
      state.name = data.name ?? '';
      state.email = data.email ?? '';
    } else {
      state.id = 0;
      state.name = '';
      state.email = '';
    }

    state.ready = true;
    state.error = null;
    return data;

  } catch (err: any) {
    state.error = err?.message || String(err);
    state.ready = true;
    state.loggedIn = false;
    return { logged_in: false };
  }
}

export function useAuth() {
  return {
    state,
    checkLogin,
  };
}
