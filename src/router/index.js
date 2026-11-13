import { createRouter, createWebHistory } from 'vue-router';
import { store } from '../store/index.js';
import { locales, defaultLocale, setLocaleCookie } from '../i18n/index.js';
import HomePage from '../pages/HomePage.vue';
import LoginPage from '../pages/LoginPage.vue';
import LobbyPage from '../pages/LobbyPage.vue';
import IntroPage from '../pages/IntroPage.vue';
import GamePage from '../pages/GamePage.vue';
import EndWinPage from '../pages/EndWinPage.vue';
import EndLosePage from '../pages/EndLosePage.vue';

/**
 * Route table (spec.md §4.1, F-P1.7): locale-prefixed routes for EN/FR.
 * Bare paths redirect to the user's preferred locale.
 */
const pages = [
  { path: '', name: 'Home', component: HomePage },
  { path: 'login', name: 'Login', component: LoginPage },
  { path: 'lobby', name: 'Lobby', component: LobbyPage },
  { path: 'intro', name: 'Intro', component: IntroPage },
  { path: 'game', name: 'Game', component: GamePage },
  { path: 'end-win', name: 'EndWin', component: EndWinPage },
  { path: 'end-lose', name: 'EndLose', component: EndLosePage },
];

// Build locale-prefixed routes for each supported locale.
const localeRoutes = locales.flatMap((lang) =>
  pages.map((p) => ({
    path: `/${lang}/${p.path}`,
    name: `${p.name}${lang === defaultLocale ? '' : '_' + lang}`,
    component: p.component,
    meta: { locale: lang },
  })),
);

// Bare-path redirects to default locale.
const bareRedirects = pages
  .filter((p) => p.path !== '')
  .map((p) => ({
    path: `/${p.path}`,
    redirect: `/${defaultLocale}/${p.path}`,
  }));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: `/${defaultLocale}/` },
    ...bareRedirects,
    ...localeRoutes,
    { path: '/:pathMatch(.*)*', redirect: `/${defaultLocale}/` },
  ],
});

// After each navigation, sync locale into store, <html lang>, and cookie.
router.afterEach((to) => {
  const lang = to.meta?.locale || defaultLocale;
  store.locale = lang;
  document.documentElement.lang = lang;
  setLocaleCookie(lang);
});
