// Banco de demonstração: questões originais escritas para este projeto (sem conteúdo de exames reais).
// Para usar as tuas próprias questões, cria bank/src/ com um manifest.mjs semelhante (a pasta é ignorada pelo Git).
export default {
  demo: true, // a interface avisa que é o banco de demonstração
  files: ['demo-a', 'demo-b', 'mini-a', 'mini-b'],
  presets: {
    mt: { label: 'Mini-teste (6 + 14)', theory: 6, practice: 14 },
    mini: { label: 'Mini-teste curto (5 + 15)', theory: 5, practice: 15 },
    curto: { label: 'Curto (2 + 5)', theory: 2, practice: 5 },
  },
};
