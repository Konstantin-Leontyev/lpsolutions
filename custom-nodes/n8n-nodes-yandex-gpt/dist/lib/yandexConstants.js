"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_POLL_TIMEOUT_MS = exports.POLL_TIMEOUT_MS = exports.POLL_INTERVAL_MS = exports.IMAGE_GENERATION_URL = exports.OPERATIONS_URL = exports.STT_GET_RECOGNITION_URL = exports.STT_RECOGNIZE_ASYNC_URL = exports.YANDEX_TTS_URL = void 0;
exports.YANDEX_TTS_URL = 'https://tts.api.cloud.yandex.net:443/tts/v3/utteranceSynthesis';
exports.STT_RECOGNIZE_ASYNC_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/recognizeFileAsync';
exports.STT_GET_RECOGNITION_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/getRecognition';
exports.OPERATIONS_URL = 'https://operation.api.cloud.yandex.net';
exports.IMAGE_GENERATION_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync';
exports.POLL_INTERVAL_MS = 1000;
exports.POLL_TIMEOUT_MS = 10 * 60 * 1000;
exports.IMAGE_POLL_TIMEOUT_MS = 15 * 60 * 1000;
//# sourceMappingURL=yandexConstants.js.map