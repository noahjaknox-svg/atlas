const THEME_STORAGE_KEY = "atlas-theme";

const themeScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=document.documentElement;if(t==="dark"){d.classList.add("dark");return}if(t==="light"){d.classList.remove("dark");return}var mqDark=window.matchMedia("(prefers-color-scheme: dark)");var mqLight=window.matchMedia("(prefers-color-scheme: light)");if(mqDark.matches||(!mqLight.matches&&!mqDark.matches)){d.classList.add("dark")}else{d.classList.remove("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
