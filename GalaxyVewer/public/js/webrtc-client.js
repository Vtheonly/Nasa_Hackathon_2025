// public/js/webrtc-client.js

class WebRTCClient {
  constructor() {
    this.ws = new WebSocket(`ws://${window.location.host}`);
    this.peerConnections = {};
    this.localStream = null;

    this.ws.onopen = () => console.log("Connected to signaling server");
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onerror = (err) => console.error("WebSocket error:", err);
    this.ws.onclose = () => console.log("Disconnected from signaling server");
  }

  handleMessage(event) {
    // This method is intended to be overridden by subclasses
    console.log("Received message in base client:", event.data);
  }

  createPeerConnection(id, onTrackCallback) {
    console.log(`Creating new RTCPeerConnection for peer: ${id}`);
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
          ],
        },
      ],
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.ws.send(JSON.stringify({ iceCandidate: event.candidate, to: id }));
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state for ${id}: ${peerConnection.connectionState}`
      );
      if (peerConnection.connectionState === "failed") {
        console.error(`WebRTC connection to peer ${id} failed.`);
      }
    };

    if (onTrackCallback) {
      peerConnection.ontrack = onTrackCallback;
    }

    this.peerConnections[id] = peerConnection;
    return peerConnection;
  }
}
