declare module '@blex41/word-search' {
  interface WordSearchOptions {
    cols: number
    rows: number
    dictionary: string[]
  }

  interface WordSearchData {
    grid: string[][]
    words: Array<{ word: string; clean: string; path: Array<{ x: number; y: number }> }>
  }

  class WordSearch {
    constructor(options: WordSearchOptions)
    data: WordSearchData
  }

  export default WordSearch
}
