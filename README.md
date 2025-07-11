
# 🎙️ Tibó AI v2 - Voice-to-Order Processing System

**Intelligent voice-based order processing system powered by Google AI**

Convert Spanish audio recordings into structured JSON orders with automatic transcription, intelligent parsing, and pricing calculations.

![Status](https://img.shields.io/badge/Status-74%25%20Complete-green) ![Version](https://img.shields.io/badge/Version-2.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Overview

Tibo AI v2 is a comprehensive voice-to-order processing system designed for marketplace and inventory management. It combines Google's Speech-to-Text API with Gemini AI to automatically transcribe Spanish audio recordings and extract structured order data including products, quantities, prices, and customer information.

### Key Features

- 🎙️ **Real-time Audio Processing** - Record and process audio directly in the browser
- 🧠 **AI-Powered Parsing** - Extract structured data from natural language
- 💰 **Automatic Price Calculation** - Calculate totals and pricing automatically  
- 📱 **Mobile-First Design** - Responsive React frontend with intuitive interface
- 🔄 **Multi-Format Support** - WAV, MP3, M4A, FLAC, WebM audio formats
- 📊 **Built-in Analytics** - Request tracking, success rates, and performance metrics
- 🌐 **Production Ready** - Comprehensive error handling and monitoring

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Frontend Features](#frontend-features)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## ⚡ Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd Google\ ADK

# Backend setup
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install

# Start development servers
# Terminal 1 (Backend)
uvicorn api:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 (Frontend)
cd frontend && npm run dev
```

Visit `http://localhost:5173` to access the application.

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern async web framework
- **Google ADK** - Agent Development Kit for AI workflows
- **Google Cloud Speech-to-Text** - Audio transcription
- **Google Gemini AI** - Natural language processing via LiteLLM
- **Pydantic** - Data validation and serialization
- **aiofiles** - Async file handling

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **MediaRecorder API** - Browser audio recording

### AI/ML
- **Google Cloud Speech-to-Text API** - Spanish audio transcription
- **Google Gemini 1.5 Flash** - Order parsing and data extraction
- **LiteLLM** - Unified LLM interface

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Cloud account with Speech-to-Text API enabled
- Google AI Studio account for Gemini API

### Backend Setup

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up Google Cloud credentials:**
```bash
# Download service account key from Google Cloud Console
# Place it as speech-to-text.json in project root
export GOOGLE_APPLICATION_CREDENTIALS="./speech-to-text.json"
```

4. **Create environment file:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Start development server:**
```bash
npm run dev
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Google AI Studio API Key (for Gemini)
GOOGLE_API_KEY=your_google_ai_studio_api_key

# Google Cloud credentials (for Speech-to-Text)
GOOGLE_APPLICATION_CREDENTIALS=./speech-to-text.json

# Optional: Custom configuration
MAX_FILE_SIZE=10485760  # 10MB
REQUEST_TIMEOUT=30
```

### Google Cloud Setup

1. **Enable Speech-to-Text API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Speech-to-Text API
   - Create a service account
   - Download the JSON key file

2. **Get Gemini API Key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add to your `.env` file

## 🎯 Usage

### Web Interface

1. **Access the app:** `http://localhost:3000`
2. **Record audio:** Click the microphone button and speak in Spanish
3. **Process order:** The system will transcribe and extract order data
4. **Review results:** Confirm or edit the extracted information

### Example Audio Input
```
"Le acabo de vender 20 cajones de tomates almita a Juan Carlos a 5.500 pesos el cajón"
```

### Expected Output
```json
{
  "status": "success",
  "transcript": "le acabo de vender 20 cajones de tomates almita a Juan Carlos a 5.500 pesos el cajón",
  "order": {
    "tipo": "orden",
    "cliente": "Juan Carlos",
    "items": [{
      "producto": "tomates almita",
      "cantidad": 20,
      "unidad": "cajones",
      "precio_unitario": 5500,
      "precio_total": 110000
    }],
    "fecha": "2025-01-27T10:30:00Z"
  },
  "ticket_id": "TKT-1234",
  "processing_time_ms": 2340
}
```

## 📡 API Documentation

### Endpoints

#### `POST /process-audio`
Process audio file and extract order data.

**Request:**
```bash
curl -X POST "http://localhost:8000/process-audio" \
     -H "Content-Type: multipart/form-data" \
     -F "audio_file=@recording.wav"
```

**Response:**
```json
{
  "status": "success",
  "transcript": "transcribed text",
  "order": { /* structured order data */ },
  "ticket_id": "TKT-1234",
  "processing_time_ms": 2340
}
```

#### `POST /process-text`
Process text directly (for testing without audio).

**Request:**
```bash
curl -X POST "http://localhost:8000/process-text" \
     -H "Content-Type: application/json" \
     -d '{"text": "vender 10 kilos de papas a María"}'
```

#### `GET /health`
Health check with dependency validation.

#### `GET /stats`
API metrics and statistics.

### Supported Audio Formats
- WAV, MP3, M4A, FLAC, WebM
- Maximum file size: 10MB
- Language: Spanish (es-ES)

## 🎨 Frontend Features

### Core Interface
- **Voice Recording** - WebRTC-based audio capture
- **Chat Interface** - WhatsApp-style conversation view
- **Order Confirmation** - Bottom sheet for editing orders
- **Real-time Processing** - Live status updates

### Navigation Sections
- **🎙️ Tibo AI** - Main voice processing interface
- **📦 Orders** - Order history and management
- **📊 Inventory** - Product catalog and stock
- **👥 Clients** - Customer database
- **📈 Reports** - Analytics and insights

### Mobile Optimization
- Touch-friendly interface
- Responsive design
- Fixed bottom navigation
- Audio recording optimized for mobile browsers

## 🔧 Development

### Project Structure
```
Google ADK/
├── api.py                 # FastAPI backend
├── main.py                # Core ADK agent logic
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── speech-to-text.json    # Google Cloud credentials
├── uploads/               # Temporary file storage
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   └── main.jsx       # App entry point
│   ├── package.json
│   └── vite.config.js
└── deploy.md              # Deployment guide
```

### Running Tests

```bash
# Backend testing
python -m pytest

# Frontend testing
cd frontend && npm test

# API testing with curl
curl -X POST "http://localhost:8000/process-text" \
     -H "Content-Type: application/json" \
     -d '{"text": "test order"}'
```

### Development Commands

```bash
# Start backend with hot reload
uvicorn api:app --reload

# Start frontend with hot reload
cd frontend && npm run dev

# View API documentation
open http://localhost:8000/docs

# View frontend
open http://localhost:3000
```

## 🚀 Deployment

### Fly.io Deployment (Recommended)

1. **Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login and configure:**
```bash
flyctl auth login
flyctl launch --name your-app-name
```

3. **Set environment variables:**
```bash
flyctl secrets set GOOGLE_API_KEY="your_key"
flyctl secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", ...}'
```

4. **Deploy:**
```bash
flyctl deploy
```

### Docker Deployment

```bash
# Build image
docker build -t tibo-ai .

# Run container
docker run -p 8000:8000 \
  -e GOOGLE_API_KEY="your_key" \
  -e GOOGLE_APPLICATION_CREDENTIALS="./speech-to-text.json" \
  tibo-ai
```

## 🔍 Troubleshooting

### Common Issues

**Audio not recording:**
- Check browser permissions for microphone
- Ensure HTTPS in production (required for MediaRecorder)
- Try different browsers (Chrome recommended)

**Transcription errors:**
- Verify Google Cloud Speech-to-Text API is enabled
- Check service account permissions
- Ensure audio quality is good

**Gemini parsing issues:**
- Verify Google AI Studio API key
- Check quota limits
- Review audio transcription quality

**File upload errors:**
- Check file size (max 10MB)
- Verify supported formats (WAV, MP3, M4A, FLAC, WebM)
- Ensure proper CORS configuration

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
uvicorn api:app --reload --log-level debug

# Check API health
curl http://localhost:8000/health

# View detailed stats
curl http://localhost:8000/stats
```

### Performance Optimization

- Audio files are automatically cleaned up after processing
- Use async/await for all I/O operations
- Implement request timeouts (30s default)
- Monitor memory usage with large audio files

## 📊 Project Status

**Current Completion: 74%**

✅ **Completed:**
- Backend API (100%)
- Frontend UI (100%) 
- Google AI Integration (94%)
- Audio Processing (100%)
- Error Handling (100%)

🚧 **In Progress:**
- Production deployment (0%)
- Advanced testing (50%)
- Documentation (20%)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For questions or issues:
- Check the [troubleshooting guide](#troubleshooting)
- Review API documentation at `/docs`
- Open an issue in the repository

---

**Built with ❤️ using Google AI, FastAPI, and React**
