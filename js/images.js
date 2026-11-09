/* images.js */
/* Mapeamento de imagens reais das universidades parceiras e fotos editoriais */
(function (root) {
  'use strict';

  root.GCImagens = {
    // Por ID de vaga
    'v1': 'assets/img/porto.jpg',
    'v2': 'assets/img/toronto.jpg',
    'v3': 'assets/img/seoul.jpg',
    'v4': 'assets/img/salamanca.jpg',
    'v5': 'assets/img/munich.jpg',
    'v6': 'assets/img/coimbra.jpg',
    'v7': 'assets/img/chile.jpg',
    'v8': 'assets/img/melbourne.jpg',
    'v9': 'assets/img/montreal.jpg',

    // Por código de país (ISO 2 letras)
    'pt': 'assets/img/porto.jpg',
    'ca': 'assets/img/toronto.jpg',
    'kr': 'assets/img/seoul.jpg',
    'es': 'assets/img/salamanca.jpg',
    'de': 'assets/img/munich.jpg',
    'cl': 'assets/img/chile.jpg',
    'au': 'assets/img/melbourne.jpg',

    // Destaque geral
    'hero': 'assets/img/hero.jpg'
  };

  // Se o caminho relativo for executado a partir de outra pasta ou protótipo solto
  if (typeof window !== 'undefined') {
    window.GCImagens = root.GCImagens;
  }
})(typeof self !== 'undefined' ? self : this);
