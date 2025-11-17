# 🚀 Copilot – System-Wide AI Writing Assistant

**Copilot** is a cross-platform AI writing assistant that works directly inside any application on **Windows, Linux, and macOS**.  
It rewrites selected text using an AI model and **types the refined output back into the active window in real time** — no copy/paste, no window switching.

The app combines **Python (system control)**, **Node.js (AI engine)** and **Electron (UI)** in a hybrid architecture to deliver a seamless desktop-wide writing experience.

---

## ✨ Features

- 🔥 **System-wide hotkey** to trigger rewriting  
- 📋 **Captures selected text automatically**  
- 🤖 **Real-time AI rewriting** using Cohere API  
- ⌨️ **Types output directly** into any application (Word, Chrome, Gmail, VS Code, etc.)  
- 🖥️ **Cross-platform**: Windows, Linux, macOS  
- 🪟 **Minimal floating UI** built with Electron  
- 🧠 **No hallucinations** thanks to strict system prompting  
- 🔒 **Avoids password/secure inputs** automatically  
- ♻️ **Auto socket reconnection** for stability  
- 📡 **Backend health monitoring** via lightweight HTTP ping server  

---

## 🏗️ Architecture Overview

Copilot is built using a **three-layer hybrid design**:

### **1. Python Backend**
- Listens for global hotkey  
- Captures selected text  
- Sends text to Node.js via TCP  
- Receives streaming AI output  
- Types the text into the active window  
- Ensures safety (blocks password fields)

### **2. Node.js Worker**
- Connects to Cohere LLM  
- Streams AI-generated text  
- Sends chunks to Python in real time  
- Uses strict system prompts to avoid hallucinations  

### **3. Electron UI**
- Starts backend processes  
- Displays connection status  
- Provides tray icon + floating widget  
- Handles fade-in and fade-out animations  

---

## 📦 Project Structure

copilot-app/
│
├── backend/
├── modules/
│
├── main.js
├── preload.js
├── renderer.js
├── worker.js
│
├── server.py
├── index.html
│
├── package.json
└── README.md


---

## 🔧 Installation

```sh
# Clone the repo
git clone https://github.com/yourusername/copilot-app
cd copilot-app

# Install Node dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

🔑 Setup Your Cohere API Key

Create a .env file:

COHERE_API_KEY=your_key_here


Update worker.js to load it:

require("dotenv").config();

▶️ Run the App
npm start

Electron will launch automatically, and the Python + Node processes will start in the background.

📝 License

This project is for educational and academic use only.
