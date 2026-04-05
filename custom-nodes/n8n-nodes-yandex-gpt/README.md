# n8n-nodes-yandex-gpt

Кастомная нода для **n8n**: **SpeechKit** (TTS/STT) и генерация изображений **YandexART** через **Foundation Models** (асинхронный REST API).

## Структура проекта

Исходники — **TypeScript** (шаблон `@n8n/node-cli`: каталоги `nodes/` и `credentials/` в корне пакета). Сборка: `npm run build` → артефакты в `dist/`.

Правило ESLint `@n8n/community-nodes/icon-validation` требует, чтобы поле `description` в классе ноды было **литералом объекта** в AST; при вынесении описания в `lib/yandexGptDescription.ts` для этого файла включено точечное отключение правила (см. комментарий в `YandexGpt.node.ts`).

Структура **Resource / Operation** повторяет ноду **OpenAI** в `n8n-nodes-base`: для каждого значения `resource` задаётся **отдельное** свойство с `name: 'operation'` и `displayOptions.show.resource` на уровне **свойства** (не на отдельных опциях). Так n8n строит список действий в каталоге и корректно резолвит `action` (см. `resolveResourceAndOperation` в `n8n-workflow`).

| Путь | Назначение |
|------|------------|
| `nodes/YandexGpt/YandexGpt.node.ts` | Класс ноды: `execute`, `loadOptions` |
| `lib/yandexGptDescription.ts` | Описание UI (`properties`, `credentials`, …) |
| `nodes/YandexGpt/*.svg`, `YandexGpt.node.json` | Иконки и метаданные codex |
| `credentials/YandexGptApi.credentials.ts` | Учётные данные |
| `lib/yandexConstants.ts` | URL сервисов и таймауты опроса операций |
| `lib/jsonParse.ts` | Разбор JSON / NDJSON ответов |
| `lib/operations.ts` | Ожидание long-running operation |
| `lib/speechkitVoices.ts` | Локали, голоса, роли, подписи для UI |
| `lib/speechkitStt.ts` | STT (recognizeFileAsync + getRecognition) |
| `lib/speechkitTts.ts` | TTS (utteranceSynthesis) |
| `lib/imageAspect.ts` | Пресеты соотношения сторон |
| `lib/imageGeneration.ts` | YandexART REST + извлечение изображения из ответа операции |

## Поведение vs OpenAI (image)

У OpenAI в узле изображений есть Quality, Style, фиксированные разрешения, выдача по URL. У **YandexART** в официальной модели API (proto / AI Studio SDK) для генерации доступны другие поля — в ноде **дублируются только они**:

| Идея OpenAI | Поддержка YandexART (Foundation Models) |
|-------------|----------------------------------------|
| Prompt | Да — текст в `messages[].text` |
| Model | Да — `modelUri` вида `art://<folderId>/<model>/<version>` (в ноде: модель + версия или полный override URI) |
| Разрешение 1024×1024 и т.д. | Нет таких полей — вместо этого **`aspectRatio`** с парами **`widthRatio` / `heightRatio`** (целые числа, соотношение сторон) |
| Quality / Style | **Нет** в `ImageGenerationOptions` |
| Seed | Да — `seed` (0 / не передавать = случайный старт по документации proto) |
| MIME-тип выхода | Да — `mimeType` (`image/jpeg`, `image/png` и т.д. — см. документацию) |
| Вес сообщения / negative prompt | Поле `weight` в proto **помечено как не поддерживаемое** — в ноде не выводится |
| Ответ картинкой по URL | API отдаёт **байты изображения** в результате операции — отдельного «только URL» в этом API нет |

Источник структуры запроса: репозиторий **cloudapi** (proto) и **yandex-ai-studio-sdk** (обёртка над gRPC).

## Технические детали реализации

- **REST:** `POST https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync`  
  Путь из объявления HTTP в proto: `yandex/cloud/ai/foundation_models/v1/image_generation/image_generation_service.proto` (репозиторий [yandex-cloud/cloudapi](https://github.com/yandex-cloud/cloudapi)).
- **Тело запроса** в формате **Proto JSON** (типичные имена полей в camelCase: `modelUri`, `messages`, `generationOptions`, `aspectRatio`, `widthRatio`, `heightRatio`, `mimeType`, `seed`).
- **Долгая операция:** ответ содержит `id` операции; опрос: `GET https://operation.api.cloud.yandex.net/operations/{id}` до `done: true`, затем извлечение `image` (base64) из `response`.

## Документация и ссылки (Яндекс Облако / AI Studio)

### Обзор и концепции

- [Foundation Models — обзор (EN)](https://yandex.cloud/en/docs/foundation-models/)
- [Foundation Models — обзор (RU)](https://yandex.cloud/ru/docs/foundation-models/)
- [Модели YandexART (EN)](https://yandex.cloud/en/docs/foundation-models/concepts/yandexart/models)
- [Модели YandexART (RU)](https://yandex.cloud/ru/docs/foundation-models/concepts/yandexart/models)

### API генерации изображений (AI Studio / Foundation Models)

- [ImageGenerationAsync.Generate — REST (EN)](https://yandex.cloud/en/docs/ai-studio/image-generation/api-ref/ImageGenerationAsync/generate)
- [ImageGenerationAsync.Generate — REST (RU)](https://yandex.cloud/ru/docs/ai-studio/image-generation/api-ref/ImageGenerationAsync/generate)
- [ImageGenerationAsync — gRPC (EN)](https://yandex.cloud/en/docs/ai-studio/image-generation/api-ref/grpc/ImageGenerationAsync/generate)
- [ImageGenerationAsync — gRPC (RU)](https://yandex.cloud/ru/docs/ai-studio/image-generation/api-ref/grpc/ImageGenerationAsync/generate)
- [Справочник API раздела image-generation (EN)](https://yandex.cloud/en/docs/ai-studio/image-generation/api-ref/)
- [Справочник API раздела image-generation (RU)](https://yandex.cloud/ru/docs/ai-studio/image-generation/api-ref/)

### Пошаговые сценарии (ссылки из комментариев в proto)

- [Запрос к YandexART — сценарий в документации (путь из proto)](https://yandex.cloud/docs/foundation-models/operations/yandexart/request)  
  (если редиректит на локализованный URL — используйте EN/RU разделы Foundation Models в консоли документации.)

### SpeechKit (аудио в этой же ноде)

- [SpeechKit — документация](https://yandex.cloud/docs/speechkit)
- [Распознавание речи (STT)](https://yandex.cloud/docs/speechkit/concepts/stt)
- [Синтез речи (TTS)](https://yandex.cloud/docs/speechkit/concepts/tts)

### Спецификации API (protobuf / HTTP-аннотации)

- [Каталог proto: `image_generation` в cloudapi](https://github.com/yandex-cloud/cloudapi/tree/master/yandex/cloud/ai/foundation_models/v1/image_generation)
- Файлы: `image_generation.proto` (сообщения `Message`, `AspectRatio`, `ImageGenerationOptions`), `image_generation_service.proto` (RPC `Generate` + HTTP `POST /foundationModels/v1/imageGenerationAsync`).

### Официальный SDK (примеры и соответствие полей)

- [yandex-cloud/yandex-ai-studio-sdk](https://github.com/yandex-cloud/yandex-ai-studio-sdk)  
  См. `src/yandex_ai_studio_sdk/_models/image_generation/` (`configure(seed=…, width_ratio=…, height_ratio=…, mime_type=…)` → proto `ImageGenerationOptions`).

### Эндпоинты (discovery)

- Сервис Foundation Models в списке эндпоинтов SDK указывается как **`llm.api.cloud.yandex.net:443`** (см. тестовые cassettes в репозитории SDK).

## Учётные данные

Нужны **Folder ID** и **API-ключ** сервисного аккаунта с правами на вызываемые API. Точные роли лучше сверять с актуальной документацией IAM для SpeechKit и Foundation Models в консоли Yandex Cloud.

## Сборка

Пакет рассчитан на `n8n-node build` из исходников; в репозитории `lpsolutions` поставляется готовый `dist/` для монтирования в контейнер n8n.
