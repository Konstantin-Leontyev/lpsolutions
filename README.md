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
    Текущий стек выводит трафик n8n в интернет через VPN (Amnezia Bridge). Конфиг должен лежать в каталоге `vpn-config/`. Без конфига контейнер `amnezia-client` не поднимется.
    ```bash
    # С вашего компьютера на сервер (один раз):
    scp amnezia_for_awg.conf <пользователь>@<сервер>:/opt/lpsolutions/vpn-config/
    ```
    Если файл уже в корне проекта на сервере: `mkdir -p vpn-config && cp amnezia_for_awg.conf vpn-config/`

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

Конфиг уже скопирован на сервер. Чтобы применить новый compose (например, переход на Amnezia Bridge):

```bash
cd /opt/lpsolutions
# Положите конфиг в vpn-config/, если лежит в корне:
mkdir -p vpn-config && cp amnezia_for_awg.conf vpn-config/ 2>/dev/null || true
git pull
docker compose down
docker compose up -d
```

Проверка VPN: `docker compose logs amnezia-client --tail 20` и  
`docker compose exec n8n sh -c 'curl -s --proxy http://amnezia-client:8080 https://ifconfig.me'` (должен вернуть IP выхода VPN).

## 🔧 Использование

### Доступ к n8n
Откройте `https://ВАШ_ДОМЕН` в браузере.

### Интеграция n8n с Ollama
1. В редакторе n8n найдите узел **"Ollama"**.
2. Настройте соединение:
   - **Base URL**: `http://ollama:11434`
   - **Model**: <название_модели>
