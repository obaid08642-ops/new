Answer files for `translate-product-content plan --external=<this dir>`: one JSON object per line in `*.jsonl`.

    {"product_id":"<id>","field":"description","source_lang":"en","target_lang":"ar","text":"<the translation>"}

Only `ar` and `en` targets are read. `source_lang` must be the language the gap was planned from (ar targets from en, en targets from ar).
Every line passes the same checks as a model answer (same numbers, right script, sane length, no markup). The guarded
`90-catalogue-apply` writes the accepted lines into EMPTY fields only, marked machine-translated.
