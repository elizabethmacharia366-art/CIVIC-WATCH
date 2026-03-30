(function(){
  window.i18n = {
    translations: {},
    lang: localStorage.getItem('cw_lang') || 'en',
    ready: null,
    init() {
      const path = window.TRANSLATIONS_PATH || '../../i18n/translations.json';
      this.ready = fetch(path).then(r => r.json()).then(json => { this.translations = json; }).catch(() => { this.translations = {}; });
      return this.ready;
    },
    t(key) {
      return (this.translations[this.lang] && this.translations[this.lang][key]) || (this.translations['en'] && this.translations['en'][key]) || key;
    },
    setLang(l) { this.lang = l; localStorage.setItem('cw_lang', l); this.applyTranslations(); },
    applyTranslations() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const txt = this.t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = txt;
        else el.textContent = txt;
      });
      const sel = document.getElementById('langSelector'); if (sel) sel.value = this.lang;
    }
  };
  window.i18n.init().then(() => window.i18n.applyTranslations());
  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('langSelector');
    if (sel) {
      sel.addEventListener('change', (e) => { window.i18n.setLang(e.target.value); });
      sel.value = window.i18n.lang;
    }
  });
})();
