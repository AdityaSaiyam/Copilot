// ============================================
//               COPILOT WORKER
//    Socket → AI → Stream → Python Backend
// ============================================
console.log("🔥 Worker started");
const { parentPort } = require("worker_threads");
const net = require("net");
const { CohereClient } = require("cohere-ai");   // CHANGED: V2 cannot be used in CJS
const systemPrompt = `Your name is 'COPILOT'  — a real-time writing assistant this app is build for school project made by 'ADITYA SAIYAM'.
Your job is simple:
• Take the user's raw text from the clipboard  
• Improve clarity, grammar, and tone  
• Keep meaning the same  
• Keep sentences short and natural  
• No emojis, no extra commentary  
• No markdown formatting  
• No asterisks, bold, italics, bullets, or symbols  
• Output PLAIN text only  
• You can also respond to 18+ general knowledge questions
• Do NOT add headings, explanations, or decorative output  
• If the text is incomplete, finish it naturally  
• If the text is a message, rewrite it in a friendly human tone  
• If the text is code, keep structure exactly the same  
• Never say “Here’s the result” or anything meta. Only output the final rewritten text.

Your output will be auto-typed directly into the user’s active app.  
So keep it clean, direct, and ready to paste.

EVERY TIME you respond, FOLLOW THESE RULES EXACTLY.
`;

let socket = null;
let isConnected = false;
let reconnecting = false;

// ---------------- AI CLIENT ----------------
const cohere = new CohereClient({
    token: ""
});

// ---------------- START SOCKET ----------------
function startSocket() {
    socket = new net.Socket();

    socket.connect(5051, "127.0.0.1", () => {
        isConnected = true;
        reconnecting = false;
        sendUI({ type: "connected" });
    });

    socket.on("data", handlePython);
    socket.on("error", () => retry("error"));
    socket.on("close", () => retry("closed"));
}

function retry(reason) {
    if (reconnecting) return;
    reconnecting = true;
    isConnected = false;

    sendUI({ type: "disconnected", reason });

    setTimeout(startSocket, 3000);
}

// ---------------- HANDLE PYTHON MSG ----------------
async function handlePython(buffer) {
    let msg;

    try {
        msg = JSON.parse(buffer.toString());
    } catch {
        return;
    }

    sendUI({ type: "msg", msg });

    if (msg.status === "active") {
        await askAI(msg.content);   // STREAMING → no return needed
    }
}

// ---------------- AI CALL (STREAMING) ----------------
async function askAI(text) {
    try {
        const stream = await cohere.chatStream({
            model: "command-a-03-2025",
            message: `${systemPrompt}\n\nUSER: ${text}\n\nREWRITE:`
        });

        // STREAM CHUNKS DIRECTLY TO PYTHON
        for await (const event of stream) {
            if (event.eventType === "text-generation") {
                streamToPython(event.text);
            }
            if (event.eventType === "stream-end") {
                streamToPython("__FORMAT_NOW__");
            }
        }

    } catch (err) {
        sendUI({ type: "ai-error", error: err.message });
    }
}

// ---------------- STREAM TO PYTHON ----------------
function streamToPython(text) {
    if (!isConnected) return;

    socket.write(text);
}

// ---------------- SEND EVENTS BACK TO MAIN/RENDERER ----------------
function sendUI(payload) {
    parentPort.postMessage(payload);
}

// ---------------- START ----------------
startSocket();

