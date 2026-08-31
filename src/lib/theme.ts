// Skupne konstante za temo (svetla / temna / sistem).
//
// "system" pomeni: sledi nastavitvi operacijskega sistema (prefers-color-scheme).
// Izbrana vrednost se hrani v localStorage; dejansko stanje na <html> je vedno
// konkretno "light" ali "dark" prek atributa data-theme.

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "posel-theme";

/**
 * Inline skripta, ki teče sinhrono med razčlenjevanjem HTML (pred prvim
 * izrisom), da se prava tema nastavi brez utripa. Prebere shranjeno izbiro,
 * jo po potrebi razreši prek sistemske nastavitve in postavi data-theme na
 * <html>. Vse v try/catch, ker localStorage ni vedno na voljo.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(p!=="light"&&p!=="dark"){p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",p);}catch(e){}})()`;
