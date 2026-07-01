// public/js/streamer-client.js

class Streamer extends WebRTCClient {
  constructor(localVideo, roomInfo, createRoomButton) {
    super();
    this.localVideo = localVideo;
    this.roomInfo = roomInfo;
    this.createRoomButton = createRoomButton;
  }

  async startStreaming() {
    try {
      this.localStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
        preferCurrentTab: true,
      });
      this.localVideo.srcObject = this.localStream;

      const sendMessage = () => {
        this.ws.send(JSON.stringify({ type: "create-room" }));
      };

      if (this.ws.readyState === WebSocket.OPEN) {
        sendMessage();
      } else {
        this.ws.onopen = sendMessage;
      }
    } catch (error) {
      console.error("Error accessing display media.", error);
      this.roomInfo.textContent =
        "Could not start stream. Please allow screen sharing.";
    }
  }

  async handleMessage(event) {
    const message = JSON.parse(event.data);
    const from = message.from;

    if (message.type === "room-created") {
      this.roomInfo.innerHTML = `Room created. Share this code: <strong>${message.roomCode}</strong>`;
      this.createRoomButton.disabled = true;
      this.createRoomButton.textContent = "Streaming...";
    }

    if (message.type === "viewer-joined") {
      console.log("Viewer joined:", from);
      this.roomInfo.innerHTML += "<br>A viewer has joined!";
      const peerConnection = this.createPeerConnection(from);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.ws.send(
        JSON.stringify({ offer: peerConnection.localDescription, to: from })
      );
    }

    if (message.answer) {
      const pc = this.peerConnections[from];
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(
          new RTCSessionDescription(message.answer)
        );
      }
    }

    if (message.iceCandidate) {
      const pc = this.peerConnections[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
      }
    }
  }
}
