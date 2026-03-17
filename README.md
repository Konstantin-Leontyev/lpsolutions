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

6.  **Скопируйте VPN-конфиг на сервер (до первого запуска)**  
    Стек выводит трафик n8n в интернет через VPN. Файл `amnezia_for_awg.conf` — в корне проекта (без опций AmneziaWG: Jc, Jmin, Jmax, S1, S2, H1–H4; при необходимости удалите эти строки из конфига).
    ```bash
    scp amnezia_for_awg.conf <пользователь>@<сервер>:/opt/lpsolutions/
    ```

7.  **Запустите стек**
    ```bash
    docker compose up -d
    ```

8. **Скачайте модель в контейнер Ollama:**
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

Проверка VPN: `docker compose logs amnezia-client --tail 20` и  
`docker compose exec n8n sh -c 'curl -s --proxy http://privoxy:8118 https://ifconfig.me'` (должен вернуть IP выхода VPN).

## 🔧 Использование

### Доступ к n8n
Откройте `https://ВАШ_ДОМЕН` в браузере.

### Интеграция n8n с Ollama
1. В редакторе n8n найдите узел **"Ollama"**.
2. Настройте соединение:
   - **Base URL**: `http://ollama:11434`
   - **Model**: <название_модели>

### Кастомная нода Yandex SpeechKit

Сборка ноды лежит в репо: `custom-nodes/n8n-nodes-yandex-speechkit/` (package.json + dist). Том в docker-compose монтирует `./custom-nodes` в контейнер — отдельный скрипт на сервере не нужен.

**На сервере после git pull:**
```bash
cd /opt/lpsolutions
git pull
docker compose up -d n8n
```

**Обновление ноды (локально):** пересобрать в репо n8n-nodes-yandex-speechkit, скопировать в lpsolutions, закоммитить и push:
```bash
# в n8n-nodes-yandex-speechkit
npm run build

# в lpsolutions
./update-custom-node.sh
# или с другим путём: ./update-custom-node.sh /path/to/n8n-nodes-yandex-speechkit

git add custom-nodes/
git commit -m "chore: update Yandex SpeechKit node"
git push
```

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
