# backend-v2/Dockerfile

FROM python:3.11

WORKDIR /app

# Copy requirements first (layer caching benefit)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# ✅ Copy app source code including Alembic files
COPY . .

# ✅ Set Python path (optional but useful for imports)
ENV PYTHONPATH=/app

# Run the FastAPI app with Uvicorn
#CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Make start.sh executable
RUN chmod +x start.sh

# Use the start script as the container entrypoint
CMD ["./start.sh"]
