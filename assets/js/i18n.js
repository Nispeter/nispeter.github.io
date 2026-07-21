/* Lightweight language toggle.
   English is each element's natural content; a `data-es` attribute holds its
   Spanish version (add `data-html` when the value contains markup). A button
   marked [data-lang-btn] flips the language; the choice is saved in localStorage.
   Progressive enhancement: with no JS the page stays in English. */
(function () {
  "use strict";
  var KEY = "lang";

  function preferred() {
    var saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "es") return saved;
    return (navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en";
  }

  function apply(lang) {
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll("[data-es]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], html = el.hasAttribute("data-html");
      if (el._en === undefined) el._en = html ? el.innerHTML : el.textContent;
      var val = (lang === "es") ? el.getAttribute("data-es") : el._en;
      if (html) el.innerHTML = val; else el.textContent = val;
    }
    var btns = document.querySelectorAll("[data-lang-btn]");
    for (var j = 0; j < btns.length; j++) {
      btns[j].textContent = (lang === "es") ? "EN" : "ES";
      btns[j].setAttribute("aria-label", lang === "es" ? "Switch to English" : "Cambiar a español");
    }
  }

  window.__setLang = function (l) { localStorage.setItem(KEY, l); apply(l); };
  window.__toggleLang = function () { window.__setLang(document.documentElement.lang === "es" ? "en" : "es"); };

  function boot() { apply(preferred()); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
