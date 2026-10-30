// Banco de demonstração: questões originais escritas para este projeto (sem conteúdo de exames reais).
// Para usar as tuas próprias questões, cria bank/src/ com um manifest.mjs semelhante (a pasta é ignorada pelo Git).
export default {
  files: ['demo-a', 'demo-b'],
  presets: {
    demo: { label: 'Demonstração (2 + 5)', theory: 2, practice: 5 },
    curto: { label: 'Curto (1 + 2,5)', theory: 1, practice: 2.5 },
  },
};
