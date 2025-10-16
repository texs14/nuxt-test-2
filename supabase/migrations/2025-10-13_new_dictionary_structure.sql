-- Создание таблицы new_dictionar с новой структурой данных
-- Основано на документации docs/new-dictionary-structure.md

CREATE TABLE IF NOT EXISTS public.new_dictionar (
  entry_id TEXT PRIMARY KEY,
  headword JSONB NOT NULL,
  metadata JSONB,
  senses JSONB NOT NULL,
  related JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Комментарии к таблице
COMMENT ON TABLE public.new_dictionar IS 'Словарь тайских слов с детализированной структурой';
COMMENT ON COLUMN public.new_dictionar.entry_id IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN public.new_dictionar.headword IS 'Объект Headword с написанием, фонетикой и аудио';
COMMENT ON COLUMN public.new_dictionar.metadata IS 'Метаданные: частоты, темы, источники';
COMMENT ON COLUMN public.new_dictionar.senses IS 'Массив значений с переводами и примерами';
COMMENT ON COLUMN public.new_dictionar.related IS 'Связанные записи: омонимы, составные слова';

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS new_dictionar_headword_script_idx 
  ON public.new_dictionar USING GIN ((headword->'script'));

CREATE INDEX IF NOT EXISTS new_dictionar_topics_idx 
  ON public.new_dictionar USING GIN ((metadata->'topics'));

CREATE INDEX IF NOT EXISTS new_dictionar_sense_ids_idx 
  ON public.new_dictionar USING GIN (senses);

CREATE INDEX IF NOT EXISTS new_dictionar_created_at_idx 
  ON public.new_dictionar (created_at DESC);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_new_dictionar_updated_at
  BEFORE UPDATE ON public.new_dictionar
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- RLS (Row Level Security) политики
ALTER TABLE public.new_dictionar ENABLE ROW LEVEL SECURITY;

-- Политика: все могут читать
CREATE POLICY "Все могут читать new_dictionar" 
  ON public.new_dictionar 
  FOR SELECT 
  USING (true);

-- Политика: только authenticated могут добавлять
CREATE POLICY "Authenticated могут добавлять в new_dictionar" 
  ON public.new_dictionar 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Политика: только authenticated могут обновлять
CREATE POLICY "Authenticated могут обновлять new_dictionar" 
  ON public.new_dictionar 
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Политика: только authenticated могут удалять
CREATE POLICY "Authenticated могут удалять из new_dictionar" 
  ON public.new_dictionar 
  FOR DELETE 
  TO authenticated
  USING (true);

-- Вставка тестовой записи
INSERT INTO public.new_dictionar (entry_id, headword, metadata, senses, related) VALUES
(
  'สวัสดี',
  '{
    "script": "สวัสดี",
    "romanization": {
      "paiboon": "sà-wàt-dee",
      "ipa": "sàʔ.wàt.diː"
    },
    "partOfSpeech": "interjection",
    "morphology": {
      "syllableCount": 3,
      "tone": "falling"
    }
  }'::jsonb,
  '{
    "frequency": {
      "spoken": 5,
      "written": 5
    },
    "topics": ["greetings", "basic"],
    "sources": ["Thai National Corpus 2024"],
    "createdAt": "2025-10-13T00:00:00Z",
    "updatedAt": "2025-10-13T00:00:00Z"
  }'::jsonb,
  '[
    {
      "senseId": "สวัสดี-greeting",
      "definition": {
        "th": "คำทักทายหรือคำอำลา",
        "en": "greeting or farewell",
        "ru": "приветствие или прощание"
      },
      "usageLabels": ["common", "polite"],
      "translations": [
        {
          "language": "en",
          "variants": [
            {
              "text": "hello",
              "register": "neutral",
              "frequency": 5
            },
            {
              "text": "goodbye",
              "register": "neutral",
              "frequency": 4
            }
          ]
        },
        {
          "language": "ru",
          "variants": [
            {
              "text": "привет",
              "register": "нейтр.",
              "frequency": 5
            },
            {
              "text": "пока",
              "register": "нейтр.",
              "frequency": 4
            },
            {
              "text": "здравствуйте",
              "register": "вежл.",
              "frequency": 5
            }
          ]
        }
      ],
      "examples": [
        {
          "exampleId": "สวัสดี-greeting-ex1",
          "sentence": {
            "th": "สวัสดีครับ",
            "en": "Hello (said by male)",
            "ru": "Здравствуйте (говорит мужчина)"
          },
          "notes": ["Добавление ครับ делает приветствие более вежливым для мужчин"]
        },
        {
          "exampleId": "สวัสดี-greeting-ex2",
          "sentence": {
            "th": "สวัสดีค่ะ",
            "en": "Hello (said by female)",
            "ru": "Здравствуйте (говорит женщина)"
          },
          "notes": ["Добавление ค่ะ делает приветствие более вежливым для женщин"]
        }
      ]
    }
  ]'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (entry_id) DO NOTHING;

-- Создание функции поиска по написанию
CREATE OR REPLACE FUNCTION search_dictionary_by_script(search_text TEXT)
RETURNS TABLE (
  entry_id TEXT,
  headword JSONB,
  metadata JSONB,
  senses JSONB,
  related JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.entry_id,
    d.headword,
    d.metadata,
    d.senses,
    d.related,
    d.created_at,
    d.updated_at
  FROM public.new_dictionar d
  WHERE d.headword->>'script' = search_text;
END;
$$ LANGUAGE plpgsql;

-- Создание функции поиска по темам
CREATE OR REPLACE FUNCTION search_dictionary_by_topic(topic_name TEXT)
RETURNS TABLE (
  entry_id TEXT,
  headword JSONB,
  metadata JSONB,
  senses JSONB,
  related JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.entry_id,
    d.headword,
    d.metadata,
    d.senses,
    d.related,
    d.created_at,
    d.updated_at
  FROM public.new_dictionar d
  WHERE d.metadata->'topics' ? topic_name;
END;
$$ LANGUAGE plpgsql;
