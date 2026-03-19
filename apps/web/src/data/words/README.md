# Local Wordbook Data

This folder is the single local source for words datasets used by the words module.

## File locations

- `apps/web/src/data/words/index.ts` - registry of all local wordbooks
- `apps/web/src/data/words/*.json` - per-book word list files

## Required JSON format

Each JSON file must be an array of word records with this shape:

```json
[
  {
    "id": "cet4_0001",
    "word": "abandon",
    "phonetic": "/əˈbændən/",
    "definition": "to leave behind",
    "example": "He abandoned the old plan.",
    "exampleZh": "他放弃了旧计划。",
    "bookId": "cet4",
    "difficulty": "medium"
  }
]
```

Field rules:

- `id`: unique string, recommended `<bookId>_<4-digit>`
- `word`: english word
- `phonetic`: IPA-like string
- `definition`: concise chinese or english definition
- `example`: english example sentence
- `exampleZh`: optional chinese translation
- `bookId`: must match the book id registered in `index.ts`
- `difficulty`: one of `easy` / `medium` / `hard`

## How to add a new wordbook

1. Add a JSON file under this folder, for example `ielts-core.json`
2. Register it in `apps/web/src/data/words/index.ts`
3. Use a unique `book.id` and keep all words' `bookId` equal to that id
4. Restart dev server and open `/words`

## Data source suggestions (you provide data locally)

You can prepare your own data from:

- Public word-frequency lists (CC BY/ODC licensed)
- Exam vocabulary materials you own rights to
- Existing CSV/Excel wordbooks exported to JSON

Before importing external datasets, confirm license allows local app usage.

## CSV to JSON conversion example

If your CSV has columns `word,phonetic,definition,example,exampleZh,difficulty`,
you can convert it with a small Node script and fill `id`/`bookId`.

## Review mode debug (local testing)

To test review without waiting real days, set a debug date in browser console:

```js
localStorage.setItem("edunexus_words_debug_today", "2026-03-18")
location.reload()
```

Clear debug date and return to real current date:

```js
localStorage.removeItem("edunexus_words_debug_today")
location.reload()
```
