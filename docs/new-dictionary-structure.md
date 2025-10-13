# Структура словарной записи

## Назначение

- **Цель** Описывает формат хранения тайских слов с переводами на английский и русский языки.
- **Использование** Источник данных для компонентов Nuxt, в том числе `app/components/VocabularyWordCard.vue`, и для таблицы `public.new_dictionar` в Supabase.

## Типы данных

```ts
type TranslationVariant = {
  text: string;
  register?: string;
  frequency?: number;
};

type TranslationBlock = {
  language: 'en' | 'ru';
  variants: TranslationVariant[];
};

type MediaAsset = {
  mediaId: string;
  url: string;
  start?: number;
  end?: number;
  captions?: Record<string, string>;
  thumbnail?: string;
  license?: string;
};

type ExampleAlignment = {
  thToken: string;
  senseId: string;
  translationVariant: Record<string, string>;
};

type ExampleItem = {
  exampleId: string;
  sentence: Record<string, string>;
  notes?: string[];
  alignments?: ExampleAlignment[];
  media?: {
    video?: MediaAsset[];
    audio?: MediaAsset[];
  };
};

type Sense = {
  senseId: string;
  definition: Record<string, string>;
  usageLabels?: string[];
  translations: TranslationBlock[];
  examples?: ExampleItem[];
};

type Headword = {
  script: string;
  romanization?: {
    paiboon?: string;
    ipa?: string;
  };
  audio?: MediaAsset[];
  partOfSpeech?: string;
  morphology?: {
    syllableCount?: number;
    tone?: string;
  };
};

type DictionaryEntry = {
  entryId: string;
  headword: Headword;
  metadata?: {
    frequency?: Record<string, number>;
    topics?: string[];
    sources?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
  senses: Sense[];
  related?: {
    homophones?: { entryId: string; relationType: string }[];
    compounds?: {
      entryId: string;
      relationType: string;
      gloss?: Record<string, string>;
    }[];
  };
};
```

## Связь с Supabase

- **Таблица** `public.new_dictionar`.
- **entry_id** `text primary key` хранит `DictionaryEntry.entryId`.
- **headword** `jsonb not null` содержит сериализованный объект `Headword`.
- **metadata** `jsonb` предназначен для блока `DictionaryEntry.metadata`.
- **senses** `jsonb not null` сохраняет массив `Sense[]`.
- **related** `jsonb` хранит сведения о родственных записях.
- **created_at/updated_at** `timestamptz` позволяют отслеживать изменения.
- **Индексы** GIN по ключам `headword -> 'script'`, `metadata -> 'topics'`, `senses -> 'senseId'` ускоряют поиск по фронтенду.

## JSON-пример

```json
{
  "entryId": "pai",
  "headword": {
    "script": "ไฟ",
    "romanization": {
      "paiboon": "fai",
      "ipa": "fāj"
    },
    "audio": [
      {
        "type": "word",
        "url": "https://cdn.example.com/audio/ไฟ.mp3",
        "speaker": "native_female",
        "license": "CC-BY"
      }
    ],
    "partOfSpeech": "noun",
    "morphology": {
      "syllableCount": 1,
      "tone": "rising"
    }
  },
  "metadata": {
    "frequency": {
      "spoken": 4,
      "written": 3
    },
    "topics": ["home", "disasters", "utilities"],
    "sources": ["Thai National Corpus 2024", "Wiktionary"],
    "createdAt": "2025-10-10T00:00:00Z",
    "updatedAt": "2025-10-10T00:00:00Z"
  },
  "senses": [
    {
      "senseId": "pai-electricity",
      "definition": {
        "th": "กระแสไฟฟ้าหรือแสงสว่างที่ผลิตจากไฟฟ้า",
        "en": "electric power or artificial light",
        "ru": "электричество или искусственный свет"
      },
      "usageLabels": ["common", "utility"],
      "translations": [
        {
          "language": "en",
          "variants": [
            {
              "text": "electricity",
              "register": "neutral",
              "frequency": 5
            },
            {
              "text": "light",
              "register": "neutral",
              "frequency": 3
            }
          ]
        },
        {
          "language": "ru",
          "variants": [
            {
              "text": "электричество",
              "register": "нейтр.",
              "frequency": 5
            },
            {
              "text": "свет",
              "register": "нейтр.",
              "frequency": 3
            }
          ]
        }
      ],
      "examples": [
        {
          "exampleId": "pai-electricity-ex1",
          "sentence": {
            "th": "ห้องนี้ไม่มีไฟ",
            "en": "This room has no electricity.",
            "ru": "В этой комнате нет электричества."
          },
          "notes": ["Использование в бытовом контексте."],
          "alignments": [
            {
              "thToken": "ไฟ",
              "senseId": "pai-electricity",
              "translationVariant": {
                "en": "electricity",
                "ru": "электричество"
              }
            }
          ],
          "media": {
            "video": [
              {
                "mediaId": "vid-utility-cut",
                "url": "https://cdn.example.com/video/ไฟ-electricity.mp4",
                "start": 12.5,
                "end": 18.0,
                "captions": {
                  "th": "ห้องนี้ไม่มีไฟ",
                  "en": "This room has no electricity.",
                  "ru": "В этой комнате нет электричества."
                },
                "thumbnail": "https://cdn.example.com/video/ไฟ-electricity.jpg",
                "license": "CC-BY-NC"
              }
            ]
          }
        }
      ]
    },
    {
      "senseId": "pai-fire",
      "definition": {
        "th": "เปลวไฟหรือการเผาไหม้",
        "en": "fire; flame; blaze",
        "ru": "огонь; пламя; пожар"
      },
      "usageLabels": ["common", "disaster"],
      "translations": [
        {
          "language": "en",
          "variants": [
            {
              "text": "fire",
              "register": "neutral",
              "frequency": 5
            },
            {
              "text": "flame",
              "register": "neutral",
              "frequency": 3
            },
            {
              "text": "blaze",
              "register": "elevated",
              "frequency": 2
            }
          ]
        },
        {
          "language": "ru",
          "variants": [
            {
              "text": "огонь",
              "register": "нейтр.",
              "frequency": 5
            },
            {
              "text": "пламя",
              "register": "нейтр.",
              "frequency": 3
            },
            {
              "text": "пожар",
              "register": "нейтр.",
              "frequency": 2
            }
          ]
        }
      ],
      "examples": [
        {
          "exampleId": "pai-fire-ex1",
          "sentence": {
            "th": "ไฟไหม้บ้านของเขา",
            "en": "His house caught fire.",
            "ru": "Дом загорелся."
          },
          "notes": ["Глагольная конструкция `ไฟไหม้` описывает пожар."],
          "alignments": [
            {
              "thToken": "ไฟ",
              "senseId": "pai-fire",
              "translationVariant": {
                "en": "fire",
                "ru": "огонь"
              }
            },
            {
              "thToken": "ไหม้",
              "senseId": "mai-to-burn",
              "translationVariant": {
                "en": "to burn",
                "ru": "гореть"
              }
            }
          ],
          "media": {
            "video": [
              {
                "mediaId": "vid-fire-news",
                "url": "https://cdn.example.com/video/ไฟ-fire.mp4",
                "start": 45.0,
                "end": 52.0,
                "captions": {
                  "th": "ไฟไหม้บ้านของเขา",
                  "en": "His house caught fire.",
                  "ru": "Дом загорелся."
                },
                "thumbnail": "https://cdn.example.com/video/ไฟ-fire.jpg",
                "license": "CC-BY"
              }
            ]
          }
        }
      ]
    }
  ],
  "related": {
    "homophones": [
      {
        "entryId": "pai-direction",
        "relationType": "homophone"
      }
    ],
    "compounds": [
      {
        "entryId": "ไฟฟ้า",
        "relationType": "compound",
        "gloss": {
          "en": "electricity",
          "ru": "электричество"
        }
      }
    ]
  }
}
```
