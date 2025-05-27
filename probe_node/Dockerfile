FROM python:3.11-slim

WORKDIR /app

# Install required system tools in one layer for better cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        iputils-ping \
        traceroute \
        curl \
        netcat-openbsd \
        dnsutils \
        whois \
        nmap \
        procps \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["python", "main.py"]
