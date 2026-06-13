FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (build-essential for numpy/scipy compilation if no prebuilt wheels are found)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code files
COPY . /app/backend

# Set environment path so relative imports work correctly
ENV PYTHONPATH=/app

# Expose port for the Physics Engine Service
EXPOSE 8000

CMD ["uvicorn", "backend.services.physics.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
