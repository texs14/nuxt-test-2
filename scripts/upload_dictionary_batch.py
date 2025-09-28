import json
import os
from collections import OrderedDict
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional

import requests

BATCH_SIZE = 50
JSONL_PATH = Path(r"d:/nuxt-thai/thai-platform/kaikki.org-dictionary-Thai.jsonl")


class SupabaseConfigError(Exception):
    """Raised when Supabase configuration variables are missing."""


def chunked(iterable: Iterable[dict], size: int) -> Iterable[List[dict]]:
    """Yield successive chunks from *iterable* of length *size*."""
    chunk: List[dict] = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) >= size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def normalize_text_list(values: Iterable[str]) -> List[str]:
    seen: "OrderedDict[str, None]" = OrderedDict()
    for value in values:
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned:
                seen.setdefault(cleaned, None)
    return list(seen.keys())


def extract_examples(sense: dict) -> List[Dict[str, str]]:
    examples: List[Dict[str, str]] = []
    for example in sense.get("examples") or []:
        if isinstance(example, dict):
            cleaned: Dict[str, str] = {}
            for key in ("text", "translation", "roman", "ref", "english"):
                val = example.get(key)
                if isinstance(val, str):
                    val = val.strip()
                    if val:
                        cleaned[key] = val
            if cleaned:
                examples.append(cleaned)
        elif isinstance(example, str):
            value = example.strip()
            if value:
                examples.append({"text": value})
    return examples


def transform_entry(entry: dict, *, line_no: int) -> Optional[dict]:
    word = entry.get("word")
    if not isinstance(word, str) or not word.strip():
        print(f"Пропуск строки {line_no}: отсутствует слово")
        return None

    senses = entry.get("senses") or []
    translations: List[str] = []
    synonyms: "OrderedDict[str, None]" = OrderedDict()
    antonyms: "OrderedDict[str, None]" = OrderedDict()
    links: "OrderedDict[str, None]" = OrderedDict()
    examples: List[Dict[str, str]] = []

    for sense in senses:
        glosses: List[str] = []
        raw_glosses = sense.get("glosses")
        if isinstance(raw_glosses, list):
            glosses.extend(raw_glosses)
        elif isinstance(raw_glosses, str):
            glosses.append(raw_glosses)

        alt_glosses = sense.get("raw_glosses")
        if isinstance(alt_glosses, list):
            glosses.extend(alt_glosses)
        elif isinstance(alt_glosses, str):
            glosses.append(alt_glosses)

        translations.extend(glosses)

        for syn in sense.get("synonyms") or []:
            candidate: Optional[str] = None
            if isinstance(syn, dict):
                candidate = syn.get("word") or syn.get("alt")
            elif isinstance(syn, str):
                candidate = syn
            if isinstance(candidate, str):
                cleaned = candidate.strip()
                if cleaned:
                    synonyms.setdefault(cleaned, None)

        for ant in sense.get("antonyms") or []:
            candidate = None
            if isinstance(ant, dict):
                candidate = ant.get("word") or ant.get("alt")
            elif isinstance(ant, str):
                candidate = ant
            if isinstance(candidate, str):
                cleaned = candidate.strip()
                if cleaned:
                    antonyms.setdefault(cleaned, None)

        for link in sense.get("links") or []:
            candidate = None
            if isinstance(link, list) and len(link) >= 2:
                candidate = link[1]
            elif isinstance(link, dict):
                candidate = link.get("url") or link.get("title")
            elif isinstance(link, str):
                candidate = link
            if isinstance(candidate, str):
                cleaned = candidate.strip()
                if cleaned:
                    links.setdefault(cleaned, None)

        examples.extend(extract_examples(sense))

    translations = normalize_text_list(translations)
    if not translations:
        print(f"Пропуск строки {line_no}: отсутствуют переводы")
        return None

    transcription: Optional[str] = None
    for form in entry.get("forms") or []:
        if isinstance(form, dict):
            tags = form.get("tags")
            if tags and "romanization" in tags:
                transcription = form.get("form")
                if isinstance(transcription, str) and transcription.strip():
                    transcription = transcription.strip()
                    break
    if not transcription:
        for sound in entry.get("sounds") or []:
            if isinstance(sound, dict):
                roman = sound.get("roman")
                if isinstance(roman, str) and roman.strip():
                    transcription = roman.strip()
                    break

    return {
        "word_th": word,
        "translation": translations,
        "synonyms": list(synonyms.keys()),
        "links": list(links.keys()),
        "transcription_en": transcription,
        "examples": examples,
        "antonyms": list(antonyms.keys()),
    }


def iter_entries() -> Iterator[dict]:
    if not JSONL_PATH.exists():
        raise FileNotFoundError(f"Файл {JSONL_PATH} не найден")

    with JSONL_PATH.open("r", encoding="utf-8") as infile:
        for line_no, raw_line in enumerate(infile, start=1):
            line = raw_line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                print(f"Пропуск строки {line_no}: невалидный JSON")
                continue

            transformed = transform_entry(entry, line_no=line_no)
            if transformed is not None:
                yield transformed


def main() -> None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        raise SupabaseConfigError(
            "Необходимо определить переменные окружения SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY"
        )

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/dictionary"

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    total_inserted = 0
    for idx, chunk in enumerate(chunked(iter_entries(), BATCH_SIZE), start=1):
        response = requests.post(endpoint, headers=headers, json=chunk)
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:  # pragma: no cover - простая обработка
            raise RuntimeError(
                f"Ошибка загрузки на шаге {idx}: {response.status_code} {response.text}"
            ) from exc
        inserted = response.json()
        chunk_inserted = len(inserted)
        total_inserted += chunk_inserted
        print(f"Чанк {idx}: добавлено {chunk_inserted} записей")

    print(f"Готово: загружено {total_inserted} записей из {JSONL_PATH.name}")


if __name__ == "__main__":
    main()
