// --- Star Data with FIXED Coordinates ---
const stars = [
  {
    id: "eta-carinae",
    title: "Eta Carinae",
    x: 0.455,
    y: 0.52,
    description:
      "A colossal stellar system, containing at least two stars with a combined luminosity over five million times that of our sun. It is famous for its “Great Eruption” in the mid-19th century.",
  },
  {
    id: "homunculus-nebula",
    title: "Homunculus Nebula",
    x: 0.8,
    y: 0.15,
    description:
      "An emission and reflection nebula shrouding Eta Carinae, formed from material ejected during the Great Eruption. It is the brightest object in the sky at mid-infrared wavelengths.",
  },
  {
    id: "keyhole-nebula",
    title: "Keyhole Nebula",
    x: 0.448,
    y: 0.44,
    description:
      "A small, dark cloud of cold molecules and dust, seen in silhouette against the brighter background of the Carina Nebula. Its appearance has changed over time due to intense radiation.",
  },
  {
    id: "trumpler-14",
    title: "Trumpler 14",
    x: 0.53,
    y: 0.28,
    description:
      "One of the youngest and most populous open star clusters in the nebula, only about 300,000 to 500,000 years old. It contains a high concentration of massive and luminous stars.",
  },
  {
    id: "trumpler-16",
    title: "Trumpler 16",
    x: 0.46,
    y: 0.55,
    description:
      "A large open cluster that is home to some of the most luminous stars in the Milky Way, including Eta Carinae and the Wolf-Rayet star WR 25.",
  },
  {
    id: "wr-22",
    title: "WR 22",
    x: 0.5,
    y: 0.4,
    description:
      "An eclipsing binary star system containing a rare Wolf-Rayet star, which is rapidly losing mass through powerful stellar winds. It is a bright source of X-rays.",
  },
  {
    id: "hd-93129a",
    title: "HD 93129A",
    x: 0.533,
    y: 0.295,
    description:
      "A triple star system composed of some of the most luminous and hottest stars in our galaxy. The primary component is one of the earliest and hottest spectral types known.",
  },
  {
    id: "mystic-mountain",
    title: "Mystic Mountain",
    x: 0.783,
    y: 0.51,
    description:
      "A three-light-year-tall pillar of gas and dust, famously imaged by the Hubble Space Telescope. It is a region of intense star-forming activity.",
  },
  {
    id: "cosmic-cliffs",
    title: "Cosmic Cliffs",
    x: 0.8,
    y: 0.2,
    description:
      "The edge of a gigantic, gaseous cavity within a young, star-forming region, revealed in stunning detail by the James Webb Space Telescope.",
  },
  {
    id: "bok-globules",
    title: "Bok Globules",
    x: 0.3,
    y: 0.2,
    description:
      "Small, dark, and dense clouds of dust and gas that are in the process of collapsing to form new stars. They are often referred to as “cocoons” for protostars.",
  },
];

// --- MarkerManager Class ---
class MarkerManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.markers = {};
    this.overlays = [];
    this.initializeStarData();
  }

  // --- THIS METHOD IS NOW CORRECTED ---
  // It no longer generates random coordinates.
  initializeStarData() {
    stars.forEach((star) => {
      // Directly assign the star object (which now includes fixed x, y coordinates)
      // to our markers dictionary.
      this.markers[star.id] = { ...star };
    });
  }

  initializeMarkers() {
    // Clear previous overlays
    this.overlays.forEach((overlay) =>
      this.viewer.removeOverlay(overlay.element)
    );
    this.overlays = [];

    for (const id in this.markers) {
      const marker = this.markers[id];
      const point = new OpenSeadragon.Point(marker.x, marker.y);

      // Main viewer marker
      const mainMarkerEl = document.createElement("div");
      mainMarkerEl.className = "marker";
      mainMarkerEl.id = id;
      mainMarkerEl.addEventListener("click", () => {
        this.goToMarker(id);
        this.showMarkerModal(id);
      });
      this.viewer.addOverlay({
        element: mainMarkerEl,
        location: point,
        placement: "CENTER",
      });
      this.overlays.push({ element: mainMarkerEl, location: point });

      // Navigator marker
      const navMarkerEl = document.createElement("div");
      navMarkerEl.className = "marker-nav";
      if (this.viewer.navigator && this.viewer.navigator.viewer) {
        this.viewer.navigator.viewer.addOverlay({
          element: navMarkerEl,
          location: point,
          placement: "CENTER",
        });
        this.overlays.push({ element: navMarkerEl, location: point });
      }
    }
  }

  goToMarker(id) {
    const marker = this.markers[id];
    if (!marker) {
      console.error(`Marker with ID "${id}" not found.`);
      return `Error: Could not find a marker with the ID ${id}.`;
    }
    const point = new OpenSeadragon.Point(marker.x, marker.y);
    this.viewer.viewport.fitBounds(
      new OpenSeadragon.Rect(point.x - 0.05, point.y - 0.05, 0.1, 0.1),
      true
    );
    return `Successfully zoomed to ${marker.title}.`;
  }

  showMarkerModal(id) {
    const marker = this.markers[id];
    if (!marker) return;
    document.getElementById("modal-title").textContent = marker.title;
    document.getElementById("modal-description").textContent =
      marker.description;
    document.getElementById("marker-modal").style.display = "block";
  }

  hideMarkerModal() {
    document.getElementById("marker-modal").style.display = "none";
  }
}

// --- Main Application Logic (No changes below this line) ---
document.addEventListener("DOMContentLoaded", async () => {
  // --- Initialize OpenSeadragon Viewer ---
  const viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
    showNavigator: true,
    navigatorPosition: "BOTTOM_RIGHT",
    blendTime: 0.3,
    constrainDuringPan: false,
  });

  // --- Initialize Marker Manager ---
  const markerManager = new MarkerManager(viewer);
  viewer.addHandler("open", () => {
    markerManager.initializeMarkers();
  });

  // --- Image Selector Logic ---
  const imageSelector = document.getElementById("image-selector");
  try {
    const response = await fetch("/api/images");
    const images = await response.json();
    if (images.length === 0) {
      imageSelector.innerHTML =
        '<option value="">Run generator script</option>';
      viewer.open("/deepzoom-images/carina-nebula/carina-nebula.dzi"); // Default
    } else {
      imageSelector.innerHTML = "";
      images.forEach((image) => {
        const option = new Option(image.name, image.path);
        if (image.path.includes("carina-nebula")) {
          option.selected = true;
        }
        imageSelector.appendChild(option);
      });
      if (imageSelector.value) {
        viewer.open(imageSelector.value);
      }
    }
  } catch (error) {
    console.error("Failed to load images:", error);
    imageSelector.innerHTML = '<option value="">Failed to load</option>';
    viewer.open("/deepzoom-images/carina-nebula/carina-nebula.dzi"); // Default
  }

  imageSelector.addEventListener("change", () => {
    const selectedPath = imageSelector.value;
    if (selectedPath) {
      viewer.open(selectedPath);
    }
  });

  // --- Modal Logic ---
  document.getElementById("modal-close-btn").addEventListener("click", () => {
    markerManager.hideMarkerModal();
  });

  // --- GROQ Chatbot Logic ---
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const GROQ_API_KEY =
    "github gurdian sucks"; // just put a groq with a q api key in here cause githu doesnt wana
  const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

  const markerIdDescription =
    "The unique identifier for the marker. Can be " +
    stars.map((s) => `'${s.id}' for ${s.title}`).join(", ");
  const tools = [
    {
      type: "function",
      function: {
        name: "goToMarker",
        description:
          "Pans and zooms the viewport to a specific named marker on the deep zoom image.",
        parameters: {
          type: "object",
          properties: {
            markerId: { type: "string", description: markerIdDescription },
          },
          required: ["markerId"],
        },
      },
    },
  ];

  const conversationHistory = [
    {
      role: "system",
      content:
        "You are an assistant for a space viewer. Use the goToMarker tool to navigate. Available markers: " +
        stars.map((s) => `${s.title} (id: '${s.id}')`).join(", ") +
        ". Confirm the action after the tool is called.",
    },
  ];

  function displayMessage(message, sender) {
    const messageEl = document.createElement("div");
    messageEl.className = `chat-message ${sender}-message`;
    messageEl.textContent = message;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function callGroqAPI(currentMessages) {
    const payload = {
      model: "llama-3.1-8b-instant",
      messages: currentMessages,
      tools: tools,
      tool_choice: "auto",
    };
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);
    return response.json();
  }

  async function handleUserMessage() {
    const userInput = chatInput.value.trim();
    if (!userInput) return;
    displayMessage(userInput, "user");
    chatInput.value = "";
    conversationHistory.push({ role: "user", content: userInput });
    try {
      const data = await callGroqAPI(conversationHistory);
      const message = data.choices[0].message;
      conversationHistory.push(message);

      if (message.tool_calls) {
        const toolCall = message.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResult =
          functionName === "goToMarker" && markerManager
            ? markerManager.goToMarker(functionArgs.markerId)
            : "Error: Map manager not ready.";

        conversationHistory.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResult,
        });

        const finalResponse = await callGroqAPI(conversationHistory);
        const finalMessage = finalResponse.choices[0].message.content;
        conversationHistory.push({ role: "assistant", content: finalMessage });
        displayMessage(finalMessage, "bot");
      } else {
        displayMessage(message.content, "bot");
      }
    } catch (error) {
      console.error("Error in chatbot logic:", error);
      displayMessage("Sorry, an error occurred.", "bot");
    }
  }

  sendBtn.addEventListener("click", handleUserMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserMessage();
  });

  // --- Streaming Initialization (Unified Logic) ---
  const localVideo = document.getElementById("local-video");
  const roomInfo = document.getElementById("room-info");
  const createRoomButton = document.getElementById("create-room");
  const streamer = new Streamer(localVideo, roomInfo, createRoomButton);

  createRoomButton.addEventListener("click", () => {
    streamer.startStreaming();
  });
});
