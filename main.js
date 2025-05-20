import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'https://cdn.skypack.dev/@google/generative-ai';

// --- Existing Three.js Setup ---
const sceneContainer = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.1, 1000);
camera.position.set(0, 1.5, 5);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
sceneContainer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // This will be our controllable light
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.5;
scene.add(floor);

const robotGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const robotMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const robot = new THREE.Mesh(robotGeometry, robotMaterial);
robot.position.set(0, 0, 0);
scene.add(robot);
// --- End of Existing Three.js Setup ---

// UI Elements
const startVoiceCmdButton = document.getElementById('startVoiceCmd');
const statusArea = document.getElementById('statusArea');
const transcribedTextArea = document.getElementById('transcribedText');

// --- Gemini API Integration ---
const API_KEY = "YOUR_API_KEY"; // <<< IMPORTANT: REPLACE WITH YOUR ACTUAL GEMINI API KEY
const MODEL_NAME = "gemini-pro"; 

if (API_KEY === "YOUR_API_KEY") {
    statusArea.textContent = "Status: Please replace YOUR_API_KEY in main.js";
    console.error("API Key not set. Please replace YOUR_API_KEY in main.js");
    startVoiceCmdButton.disabled = true;
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// --- Function Declarations for Gemini ---
const moveRobotDeclaration = {
    name: "moveRobot",
    description: "Moves the robot in the specified direction. Optional distance.",
    parameters: {
        type: "object",
        properties: {
            direction: {
                type: "string",
                description: "The direction to move the robot (e.g., forward, backward, left, right, stop)."
            },
            distance: {
                type: "number",
                description: "Optional. The distance in units the robot should move. Defaults to one step."
            }
        },
        required: ["direction"]
    }
};

const controlLightDeclaration = {
    name: "controlLight",
    description: "Controls a light in the room, turning it on or off, or setting its brightness.",
    parameters: {
        type: "object",
        properties: {
            state: {
                type: "string",
                description: "The desired state of the light (e.g., on, off)."
            },
            brightness: {
                type: "number",
                description: "Optional. The brightness level from 0 to 100. Only applicable if state is 'on'."
            }
        },
        required: ["state"]
    }
};

const findItemDeclaration = {
    name: "findItem",
    description: "Commands the robot to find a specified item in the room.",
    parameters: {
        type: "object",
        properties: {
            itemName: {
                type: "string",
                description: "The name of the item to find (e.g., keys, remote, phone)."
            }
        },
        required: ["itemName"]
    }
};
// --- End of Function Declarations ---

let mediaRecorder;
let audioChunks = [];

// Predefined item positions for "find" action
const itemPositions = {
    "keys": new THREE.Vector3(2, 0, -1),
    "remote": new THREE.Vector3(-2, 0, 1),
    "phone": new THREE.Vector3(0, 0, 2),
};
// Create visual markers for items (optional, but good for user)
Object.keys(itemPositions).forEach(itemName => {
    const itemGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const itemMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green
    const itemMesh = new THREE.Mesh(itemGeometry, itemMaterial);
    itemMesh.position.copy(itemPositions[itemName]);
    itemMesh.name = itemName; // For identification if needed
    scene.add(itemMesh);
});


function executeRobotAction(command) {
    if (!command || typeof command.action === 'undefined') {
        statusArea.textContent = "Status: Unknown command structure received.";
        console.warn("Unknown command structure:", command);
        return;
    }

    const action = command.action.toLowerCase();
    const moveStep = 0.5; // How far the robot moves each time

    switch (action) {
        case "move":
            if (command.direction) {
                const direction = command.direction.toLowerCase();
                let newRobotPosition = robot.position.clone();
                if (direction === "forward") newRobotPosition.z -= moveStep;
                else if (direction === "backward") newRobotPosition.z += moveStep;
                else if (direction === "left") newRobotPosition.x -= moveStep;
                else if (direction === "right") newRobotPosition.x += moveStep;
                else if (direction === "stop") { /* Do nothing for stop, or implement specific stop logic */ }
                else {
                    statusArea.textContent = `Status: Unknown move direction: ${direction}`;
                    return;
                }
                // Basic boundary check (relative to floor size)
                if (Math.abs(newRobotPosition.x) < 5 && Math.abs(newRobotPosition.z) < 5) {
                    robot.position.copy(newRobotPosition);
                    statusArea.textContent = `Status: Robot moved ${direction}.`;
                } else {
                    statusArea.textContent = `Status: Robot cannot move further ${direction}. Boundary reached.`;
                }
            } else {
                statusArea.textContent = "Status: Move command missing direction.";
            }
            break;
        case "lights":
            if (command.state) {
                const lightState = command.state.toLowerCase();
                if (lightState === "on") {
                    directionalLight.intensity = 0.8;
                    statusArea.textContent = "Status: Lights turned ON.";
                } else if (lightState === "off") {
                    directionalLight.intensity = 0.1; // Dim but not completely off
                    statusArea.textContent = "Status: Lights turned OFF.";
                } else {
                    statusArea.textContent = `Status: Unknown light state: ${lightState}`;
                }
            } else {
                statusArea.textContent = "Status: Light command missing state.";
            }
            break;
        case "find":
            if (command.item) {
                const itemToFind = command.item.toLowerCase();
                if (itemPositions[itemToFind]) {
                    robot.position.copy(itemPositions[itemToFind]); // Teleport robot to item for simplicity
                    statusArea.textContent = `Status: Robot found ${itemToFind}.`;
                } else {
                    statusArea.textContent = `Status: Item '${itemToFind}' not recognized or position unknown.`;
                }
            } else {
                statusArea.textContent = "Status: Find command missing item name.";
            }
            break;
        case "unknown":
            statusArea.textContent = "Status: Command not understood by Gemini.";
            break;
        default:
            statusArea.textContent = `Status: Unhandled action: ${action}`;
            console.warn("Unhandled action:", command);
    }
}

startVoiceCmdButton.addEventListener('click', async function handleVoiceCommand() {
    if (API_KEY === "YOUR_API_KEY") {
        alert("Please replace YOUR_API_KEY in main.js with your actual Gemini API Key.");
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        // Button text/behavior will be reset in mediaRecorder.onstop
        return;
    }
    
    statusArea.textContent = "Status: Listening...";
    transcribedTextArea.textContent = "Transcribed: ...";
    startVoiceCmdButton.disabled = true;
    audioChunks = [];

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Specify mimetype

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            statusArea.textContent = "Status: Processing voice command...";
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Audio = reader.result.split(',')[1];

                const generationConfig = { maxOutputTokens: 150 }; // Increased tokens for JSON
                const safetySettings = [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ];
                
                const newPromptText = "You are an AI assistant for a home care robot. Listen to the voice command and use the provided functions (moveRobot, controlLight, findItem) to execute the command. If the command is unclear or cannot be mapped to a function, indicate that by responding with text and not a function call.";
                
                const contents = [
                    {
                        role: "user",
                        parts: [
                            { text: newPromptText },
                            { inlineData: { mimeType: "audio/webm", data: base64Audio } }
                        ]
                    }
                ];

                const tools = [{
                    functionDeclarations: [moveRobotDeclaration, controlLightDeclaration, findItemDeclaration]
                }];

                const toolConfig = {
                    functionCallingConfig: {
                        mode: "AUTO",
                    }
                };

                try {
                    statusArea.textContent = "Status: Sending to Gemini for function call...";
                    const result = await model.generateContent({
                        contents,
                        tools,
                        toolConfig,
                        generationConfig,
                        safetySettings
                    });
                    const response = result.response;
                    
                    // Check for function call in response
                    const functionCall = response.candidates[0].content.parts.find(part => part.functionCall);

                    if (functionCall) {
                        transcribedTextArea.textContent = "Gemini Action: " + functionCall.functionCall.name + JSON.stringify(functionCall.functionCall.args);
                        // Directly use the functionCall.args for executeRobotAction,
                        // but we need to adapt executeRobotAction or map the args.
                        // For now, let's assume executeRobotAction can be adapted or we map here.
                        
                        const actionName = functionCall.functionCall.name;
                        const actionArgs = functionCall.functionCall.args;

                        // Map Gemini function names and args to existing executeRobotAction structure
                        let commandForExecution;
                        if (actionName === "moveRobot") {
                            commandForExecution = { action: "move", direction: actionArgs.direction, distance: actionArgs.distance };
                        } else if (actionName === "controlLight") {
                            commandForExecution = { action: "lights", state: actionArgs.state, brightness: actionArgs.brightness };
                        } else if (actionName === "findItem") {
                            commandForExecution = { action: "find", item: actionArgs.itemName };
                        } else {
                            commandForExecution = { action: "unknown" };
                            statusArea.textContent = "Status: Unknown function call received from Gemini.";
                        }
                        executeRobotAction(commandForExecution);

                    } else {
                        // Handle cases where Gemini responds with text instead of a function call
                        let commandText = response.text(); // or response.candidates[0].content.parts[0].text
                        transcribedTextArea.textContent = "Gemini Text Response: " + commandText;
                        statusArea.textContent = "Status: Received text response from Gemini. No action taken.";
                        // Optionally, you could try to parse this text for simple commands if needed,
                        // but the goal of function calling is to avoid that.
                        executeRobotAction({action: "unknown", detail: commandText});
                    }

                } catch (err) {
                    console.error("Gemini API error (function calling):", err);
                    statusArea.textContent = "Status: Error interpreting command. See console.";
                    transcribedTextArea.textContent = "Transcribed: Error from API.";
                } finally {
                    startVoiceCmdButton.textContent = "Start Voice Command";
                    startVoiceCmdButton.disabled = false;
                    // Re-attach original listener logic for next click
                    // startVoiceCmdButton.onclick = handleVoiceCommand; // This line is problematic if the listener was added with addEventListener
                }
            };
            reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        statusArea.textContent = "Status: Recording... Click button again to stop and process.";
        startVoiceCmdButton.textContent = "Stop Recording & Process";
        startVoiceCmdButton.disabled = false; // Keep it enabled to stop

    } catch (error) {
        console.error('Failed to get media stream:', error);
        statusArea.textContent = "Status: Microphone access denied or error.";
        transcribedTextArea.textContent = "Transcribed: Error.";
        startVoiceCmdButton.textContent = "Start Voice Command";
        startVoiceCmdButton.disabled = false;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
});

// Render loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

if (API_KEY !== "YOUR_API_KEY") {
    statusArea.textContent = "Status: 3D Scene Loaded. Ready for voice commands.";
}
console.log("Three.js scene and Gemini integration active. Ready for robot actions.");
