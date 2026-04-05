"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOICES_WITHOUT_ROLES = exports.ROLES_BY_VOICE = exports.VOICES_BY_LOCALE = exports.LOCALE_OPTIONS = void 0;
exports.formatVoiceLabel = formatVoiceLabel;
exports.formatRoleLabel = formatRoleLabel;
exports.LOCALE_OPTIONS = [
    { name: 'De-DE (Немецкий)', value: 'de-DE' },
    { name: 'En-US (Английский)', value: 'en-US' },
    { name: 'He-IL (Иврит)', value: 'he-IL' },
    { name: 'Kk-KZ (Казахский)', value: 'kk-KZ' },
    { name: 'Ru-RU (Русский)', value: 'ru-RU' },
    { name: 'Uz-UZ (Узбекский)', value: 'uz-UZ' },
];
exports.VOICES_BY_LOCALE = {
    'ru-RU': [
        'alena',
        'alexander',
        'anton',
        'dasha',
        'ermil',
        'filipp',
        'jane',
        'julia',
        'kirill',
        'lera',
        'madi_ru',
        'marina',
        'masha',
        'omazh',
        'saule_ru',
        'yulduz_ru',
        'zahar',
        'zamira_ru',
        'zhanar_ru',
    ],
    'en-US': ['john'],
    'de-DE': ['lea'],
    'he-IL': ['naomi'],
    'kk-KZ': ['amira', 'madi', 'saule', 'zhanar'],
    'uz-UZ': ['nigora', 'zamira', 'yulduz'],
};
exports.ROLES_BY_VOICE = {
    lea: [],
    john: [],
    naomi: ['modern', 'classic'],
    amira: [],
    madi: [],
    saule: ['neutral', 'strict'],
    zhanar: ['neutral', 'friendly'],
    alena: ['neutral', 'good'],
    filipp: [],
    ermil: ['neutral', 'good'],
    jane: ['neutral', 'good', 'evil'],
    omazh: ['neutral', 'evil'],
    zahar: ['neutral', 'good'],
    dasha: ['neutral', 'good', 'friendly'],
    julia: ['neutral', 'strict'],
    lera: ['neutral', 'friendly'],
    masha: ['good', 'strict', 'friendly'],
    marina: ['neutral', 'whisper', 'friendly'],
    alexander: ['neutral', 'good'],
    kirill: ['neutral', 'strict', 'good'],
    anton: ['neutral', 'good'],
    madi_ru: [],
    saule_ru: ['neutral', 'strict', 'whisper'],
    zamira_ru: ['neutral', 'strict', 'friendly'],
    zhanar_ru: ['neutral', 'strict', 'friendly'],
    yulduz_ru: ['neutral', 'strict', 'friendly', 'whisper'],
    nigora: [],
    zamira: ['neutral', 'strict', 'friendly'],
    yulduz: ['neutral', 'strict', 'friendly', 'whisper'],
};
exports.VOICES_WITHOUT_ROLES = Object.entries(exports.ROLES_BY_VOICE)
    .filter(([, roles]) => roles.length === 0)
    .map(([voice]) => voice);
function formatVoiceLabel(voiceValue, locale) {
    let base = voiceValue;
    if (locale === 'ru-RU') {
        base = base.replace(/_ru$/, '');
    }
    return base
        .split(/_/g)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join('');
}
function formatRoleLabel(roleValue) {
    return roleValue
        .split(/_/g)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join('');
}
//# sourceMappingURL=speechkitVoices.js.map