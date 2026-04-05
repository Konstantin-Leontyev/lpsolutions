# 🚀 Персональный стек n8n + AI

Развёртывание платформы автоматизации n8n с локальной AI-моделью DeepSeek-R1 через Ollama.

## 📦 Быстрый старт

1.  **Подключитесь к серверу**
    ```bash
    ssh <ваш_пользователь>@<ваш_домен_или_айпи>
    ```

2.  **Перейдите в папку `/opt`**
    ```bash
    cd /opt
    ```

3.  **Клонируйте репозиторий**
    ```bash
    git clone https://github.com/your-username/lpsolutions.git
    cd lpsolutions
    ```

4.  **Сгенерируйте ключ для n8n**
    ```bash
    # Генерируйте ключ длиной 24 байта (32 символа в base64):
    openssl rand -base64 24
    ```

5.  **Настройте окружение**
    ```bash
    # Скопируйте шаблон и отредактируйте
    cp .env.example .env
    nano .env  # Заполните ВСЕ переменные!
    ```

6.  **Запустите стек**
    ```bash
    docker compose up -d
    ```

7. **Скачайте модель в контейнер Ollama:**
    ```bash
    docker compose exec ollama ollama pull <название_модели>

    # Например
    docker compose exec ollama ollama pull deepseek-r1:7b
    ```

## 🔄 Перезапуск после обновления (git pull)

```bash
cd /opt/lpsolutions
git pull
docker compose down
docker compose up -d
```

## 🔧 Использование

### Доступ к n8n
Откройте `https://ВАШ_ДОМЕН` в браузере.

### Интеграция n8n с Ollama
1. В редакторе n8n найдите узел **"Ollama"**.
2. Настройте соединение:
   - **Base URL**: `http://ollama:11434`
   - **Model**: <название_модели>

### Кастомная нода Yandex GPT

Сборка ноды лежит в репо: `custom-nodes/n8n-nodes-yandex-gpt/` (package.json + dist). Том в docker-compose монтирует `./custom-nodes` в контейнер. Поддерживаются **аудио** (SpeechKit TTS/STT) и **изображения** (YandexART / Foundation Models). Список официальных ссылок на документацию Яндекса и сопоставление опций с OpenAI — в [custom-nodes/n8n-nodes-yandex-gpt/README.md](custom-nodes/n8n-nodes-yandex-gpt/README.md).

### Отладка n8n (полные логи)

Чтобы понять, почему контейнер перезапускается или нода не подхватывается:

```bash
# Все логи n8n с момента последнего старта (без ограничения строк)
docker compose logs n8n 2>&1

# Сохранить в файл и скачать
docker compose logs n8n 2>&1 > n8n-full.log

# Только строки entrypoint и ошибки
docker compose logs n8n 2>&1 | grep -E '\[entrypoint\]|Error|error|ECONNREFUSED|Cannot find'
```
