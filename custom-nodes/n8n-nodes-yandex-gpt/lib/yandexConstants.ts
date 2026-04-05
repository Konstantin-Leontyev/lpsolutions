export const YANDEX_TTS_URL = 'https://tts.api.cloud.yandex.net:443/tts/v3/utteranceSynthesis';

export const STT_RECOGNIZE_ASYNC_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/recognizeFileAsync';
export const STT_GET_RECOGNITION_URL = 'https://stt.api.cloud.yandex.net:443/stt/v3/getRecognition';

export const OPERATIONS_URL = 'https://operation.api.cloud.yandex.net';

export const IMAGE_GENERATION_URL =
	'https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync';

export const POLL_INTERVAL_MS = 1000;
export const POLL_TIMEOUT_MS = 10 * 60 * 1000;
export const IMAGE_POLL_TIMEOUT_MS = 15 * 60 * 1000;
