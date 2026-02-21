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

    **Вариант с VPN (выход в интернет через Amnezia):** после клонирования и создания `.env` скопируйте файл `amnezia_for_awg.conf` на удалённый сервер в каталог проекта (файл в репозиторий не входит), затем запустите:
    ```bash
    # С вашего компьютера на сервер (один раз):
    scp amnezia_for_awg.conf <пользователь>@<сервер>:/opt/lpsolutions/

    # На сервере:
    docker compose up -d
    ```

7. **Скачайте модель в контейнер Ollama:**
    ```bash
    docker compose exec ollama ollama pull <название_модели>

    # Например
    docker compose exec ollama ollama pull deepseek-r1:7b
    ```

## 🔧 Использование

### Доступ к n8n
Откройте `https://ВАШ_ДОМЕН` в браузере.

### Интеграция n8n с Ollama
1. В редакторе n8n найдите узел **"Ollama"**.
2. Настройте соединение:
   - **Base URL**: `http://ollama:11434`
   - **Model**: <название_модели>
