import json
from collections import OrderedDict
from pathlib import Path

SOURCE_PATH = Path(r"d:/nuxt-thai/thai-platform/kaikki.org-dictionary-Thai.jsonl")
OUTPUT_PATH = Path(r"d:/nuxt-thai/thai-platform/scripts/dictionary_batch1.json")


def normalize_text_list(values):
    seen = OrderedDict()
    for value in values:
        if isinstance(value, str):
            value = value.strip()
            if value:
                seen.setdefault(value, None)
    return list(seen.keys())


def extract_examples(sense):
    examples = []
    for example in sense.get("examples") or []:
        if isinstance(example, dict):
            cleaned = {}
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


def main():
    result = []
    seen_words = set()
    with SOURCE_PATH.open("r", encoding="utf-8") as infile:
        for line in infile:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            word = entry.get("word")
            if not word or word in seen_words:
                continue

            senses = entry.get("senses") or []
            translations = []
            synonyms = OrderedDict()
            antonyms = OrderedDict()
            links = OrderedDict()
            examples = []

            for sense in senses:
                glosses = []
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
                    candidate = None
                    if isinstance(syn, dict):
                        candidate = syn.get("word") or syn.get("alt")
                    elif isinstance(syn, str):
                        candidate = syn
                    if isinstance(candidate, str):
                        candidate = candidate.strip()
                        if candidate:
                            synonyms.setdefault(candidate, None)

                for ant in sense.get("antonyms") or []:
                    candidate = None
                    if isinstance(ant, dict):
                        candidate = ant.get("word") or ant.get("alt")
                    elif isinstance(ant, str):
                        candidate = ant
                    if isinstance(candidate, str):
                        candidate = candidate.strip()
                        if candidate:
                            antonyms.setdefault(candidate, None)

                for link in sense.get("links") or []:
                    candidate = None
                    if isinstance(link, list) and len(link) >= 2:
                        candidate = link[1]
                    elif isinstance(link, dict):
                        candidate = link.get("url") or link.get("title")
                    elif isinstance(link, str):
                        candidate = link
                    if isinstance(candidate, str):
                        candidate = candidate.strip()
                        if candidate:
                            links.setdefault(candidate, None)

                examples.extend(extract_examples(sense))

            translations = normalize_text_list(translations)
            if not translations:
                continue

            transcription = None
            for form in entry.get("forms") or []:
                if isinstance(form, dict):
                    tags = form.get("tags")
                    if tags and "romanization" in tags:
                        transcription = form.get("form")
                        if transcription:
                            break
            if not transcription:
                for sound in entry.get("sounds") or []:
                    if isinstance(sound, dict):
                        roman = sound.get("roman")
                        if isinstance(roman, str) and roman.strip():
                            transcription = roman.strip()
                            break

            result.append(
                {
                    "word_th": word,
                    "translation": translations,
                    "synonyms": list(synonyms.keys()),
                    "links": list(links.keys()),
                    "transcription_en": transcription,
                    "examples": examples,
                    "antonyms": list(antonyms.keys()),
                }
            )

            seen_words.add(word)
            if len(result) >= 100:
                break

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(result)} records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
