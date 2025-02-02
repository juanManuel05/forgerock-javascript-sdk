/* eslint-disable @typescript-eslint/no-unused-vars */
import { Config, FRUser, TokenManager, UserManager } from '@forgerock/javascript-sdk';
import { client } from '@forgerock/token-vault';

/** ****************************************************
 * START: CONFIGURE THE TOKEN VAULT
 **************************************************** */

// Initialize the Token Vault Client
const register = client({
  app: {
    origin: 'http://localhost:5823',
  },
  interceptor: {
    file: new URL('/src/interceptor.ts', import.meta.url).pathname,
    scope: '/',
  },
  proxy: {
    origin: 'http://localhost:5833',
  },
});

// Register the Token Vault Interceptor
const interceptor = await register.interceptor();

// Register the Token Vault Proxy
const proxy = await register.proxy(document.getElementById('token-vault') as HTMLElement);

// Register the Token Vault Store
const tokenStore = register.store();

/** ****************************************************
 * END: CONFIGURE THE TOKEN VAULT
 **************************************************** */

//
// ----------------------------------------------------
//

/** ****************************************************
 * START: SDK CONFIGURATION
 **************************************************** */

Config.set({
  clientId: 'CentralLoginOAuthClient',
  redirectUri: `${window.location.origin}`,
  scope: 'openid profile me.read',
  serverConfig: {
    baseUrl: 'https://auth.example.com:9443/am',
    timeout: 5000,
  },
  realmPath: 'root',
  tokenStore: {
    get: tokenStore.get,
    set: tokenStore.set,
    remove: tokenStore.remove,
  },
});

/** ****************************************************
 * END: SDK CONFIGURATION
 **************************************************** */

//
// ----------------------------------------------------
//

/** ****************************************************
 * START: APPLICATION LOGIC
 ***************************************************** */

/**
 * Check URL for query parameters
 */
const url = new URL(document.location.href);
const params = url.searchParams;
const code = params.get('code');
const state = params.get('state');

/**
 * Get the elements we need to update
 */
function getById(id: string) {
  return document.getElementById(id) as HTMLElement;
}
// Buttons
const fetchMockBtn = getById('fetchMockBtn');
const fetchUserBtn = getById('fetchUserBtn');
const hasTokensBtn = getById('hasTokensBtn');
const refreshTokensBtn = getById('refreshTokensBtn');
const loginBtn = getById('loginBtn');
const logoutBtn = getById('logoutBtn');

// Definition elements
const loggedInEl = getById('loggedInDef');
const userInfoEl = getById('userInfoDef');
const hasTokensEl = getById('hasTokensDef');
const refreshTokensEl = getById('refreshTokensDef');

/**
 * If the URL has state and code as query parameters, then the user
 * returned back here after successfully logging in, so call authorize
 * with the values
 */
if (state && code) {
  await TokenManager.getTokens({ query: { code, state } });
  location.replace('http://localhost:5823');
}

/**
 * Let's make an initial check for tokens to see if the user is logged in
 */
const res = await (async () => {
  return await tokenStore.has();
})();
if (res.hasTokens) {
  loggedInEl.innerText = 'true';
  hasTokensEl.innerText = 'true';
}

/** ****************************************************
 * ATTACH USER EVENT LISTENERS
 */
fetchMockBtn.addEventListener('click', async (event) => {
  await fetch('https://jsonplaceholder.typicode.com/todos');
});
fetchUserBtn.addEventListener('click', async (event) => {
  const user = (await UserManager.getCurrentUser()) as any;

  userInfoEl.innerText = user?.name;
  console.log(user);
});
hasTokensBtn.addEventListener('click', async (event) => {
  const res = await tokenStore.has();

  hasTokensEl.innerText = String(res.hasTokens);
  console.log(res);
});
refreshTokensBtn.addEventListener('click', async (event) => {
  const res = await tokenStore.refresh();

  refreshTokensEl.innerText = String(res.refreshTokens);
  console.log(res);
});
loginBtn.addEventListener('click', async (event) => {
  console.log('Logging in...');
  await TokenManager.getTokens({
    login: 'redirect',
    forceRenew: true,
    query: { acr_values: 'SpecificTree' },
  });
});
logoutBtn.addEventListener('click', async (event) => {
  // Not all endpoints are supported and will fail
  await FRUser.logout();

  loggedInEl.innerText = 'false';
  hasTokensEl.innerText = 'false';
  refreshTokensEl.innerText = 'false';
  userInfoEl.innerText = 'n/a';
  console.log('Logged out');
});
