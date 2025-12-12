import { reactive } from 'vue';

type MeResponse = {
  logged_in: boolean;
  id?: number;
  name?: string;
  email?: string;
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
  const isWP = typeof (window as any).CLIC_CHATBOT !== 'undefined';

  // --- 1. Se NÃO estiver no WordPress, app roda normalmente ---
  if (!isWP) {
    state.ready = true;
    state.loggedIn = false;
    return { logged_in: false };
  }

  // --- 2. Está no WordPress: seguir fluxo normal ---
  const root = (window as any).CLIC_CHATBOT?.rest_root ?? '/wp-json/clic-chatbot/v1/';
  const nonce = (window as any).CLIC_CHATBOT?.nonce ?? '';

  try {
    const res = await fetch(root + 'me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-WP-Nonce': nonce  // ← ESSENCIAL
      }
    });

    if (!res.ok) {
      state.error = `HTTP ${res.status}`;
      state.ready = true;
      return { logged_in: false };
    }

    const data = await res.json() as MeResponse;

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
    checkLogin
  };
}
