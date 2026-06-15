class PrefixTree {
  constructor() {
    this.root = {};
    this.endSymbol = "*";
  }

  insert(word) {
    let current = this.root;
    for (const c of word) {
      if (!(c in current)) {
        current[c] = {};
      }
      current = current[c];
    }
    current[this.endSymbol] = true;
  }

  exists(word) {
    let current = this.root;
    for (const letter of word) {
      if (!(letter in current)) {
        return false;
      }
      current = current[letter];
    }
    return this.endSymbol in current;
  }

  searchLevel(currentLevel, currentPrefix, words) {
    if (this.endSymbol in currentLevel) {
      words.push(currentPrefix);
    }
    for (const [letter, nextLevel] of Object.entries(currentLevel)) {
      if (letter !== this.endSymbol) {
        this.searchLevel(nextLevel, currentPrefix + letter, words);
      }
    }
  }

  wordsWithPrefix(prefix) {
    let current = this.root;
    for (const letter of prefix) {
      if (!(letter in current)) {
        return [];
      }
      current = current[letter];
    }
    const words = [];
    this.searchLevel(current, prefix, words);
    return words;
  }

  findMatches(document) {
    const matches = new Set();
    for (let i = 0; i < document.length; i++) {
      let currentLevel = this.root;
      for (let j = i; j < document.length; j++) {
        if (!(document[j] in currentLevel)) {
          break;
        }
        currentLevel = currentLevel[document[j]];
        if (this.endSymbol in currentLevel) {
          matches.add(document.slice(i, j + 1));
        }
      }
    }
    return matches;
  }

  advancedFindMatches(document, variations) {
    const matches = new Set();
    for (let i = 0; i < document.length; i++) {
      let currentLevel = this.root;
      for (let j = i; j < document.length; j++) {
        const canonical =
          document[j] in variations ? variations[document[j]] : document[j];
        if (!(canonical in currentLevel)) {
          break;
        }
        currentLevel = currentLevel[canonical];
        if (this.endSymbol in currentLevel) {
          matches.add(document.slice(i, j + 1));
        }
      }
    }
    return matches;
  }

  longestCommonPrefix() {
    let prefix = "";
    let current = this.root;
    while (Object.keys(current).length === 1 && !(this.endSymbol in current)) {
      const letter = Object.keys(current)[0];
      prefix += letter;
      current = current[letter];
    }
    return prefix;
  }
}

module.exports = { PrefixTree };
