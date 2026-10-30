// Banco de demonstração: questões originais escritas para este projeto (sem conteúdo de exames reais).
// Para usar as tuas próprias questões, cria bank/src/ com um manifest.mjs semelhante (a pasta é ignorada pelo Git).
export default {
  demo: true, // a interface avisa que é o banco de demonstração
  files: ['demo-a', 'demo-b', 'mini-a'],
  presets: {
    demo: { label: 'Demonstração (2 + 5)', theory: 2, practice: 5 },
    curto: { label: 'Curto (1 + 2,5)', theory: 1, practice: 2.5 },
  },
};
