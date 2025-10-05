// public/js/viewer-client.js

class Viewer extends WebRTCClient {
  constructor(remoteVideo, statusElement, joinContainer) {
    super();
    this.remoteVideo = remoteVideo;
    this.statusElement = statusElement;
    this.joinContainer = joinContainer;
    this.iceCandidateQueue = [];
  }

  joinRoom(roomCode) {
    if (!roomCode.trim()) {
      this.statusElement.textContent = "Please enter a valid room code.";
      return;
    }
    this.joinContainer.style.display = "none";
    this.statusElement.textContent = `Attempting to join room: ${roomCode}...`;

    const sendMessage = () => {
      this.ws.send(JSON.stringify({ type: "join-room", roomCode }));
    };

    if (this.ws.readyState === WebSocket.OPEN) {
      sendMessage();
    } else {
      this.ws.onopen = sendMessage;
    }
  }

  async handleMessage(event) {
    const message = JSON.parse(event.data);

    if (message.type === "error") {
      this.statusElement.textContent = `Error: ${message.message}. Please try again.`;
      this.joinContainer.style.display = "block";
      return;
    }

    if (message.type === "room-joined") {
      this.statusElement.textContent = "Room joined. Waiting for stream...";
    }

    if (message.offer) {
      this.statusElement.textContent = "Stream found! Connecting...";

      const onTrack = (event) => {
        this.remoteVideo.srcObject = event.streams[0];
        this.remoteVideo.style.display = "block";
        this.statusElement.style.display = "none";
        this.remoteVideo.play().catch((e) => {
          console.error("Autoplay prevented:", e);
          this.statusElement.textContent =
            "Stream connected! Click video to play.";
          this.statusElement.style.display = "block";
        });
      };

      const peerConnection = this.createPeerConnection(message.from, onTrack);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );

      // Process any queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        await peerConnection.addIceCandidate(this.iceCandidateQueue.shift());
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      this.ws.send(
        JSON.stringify({
          answer: peerConnection.localDescription,
          to: message.from,
        })
      );
    }

    if (message.iceCandidate) {
      const pc = this.peerConnections[message.from];
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
      } else {
        this.iceCandidateQueue.push(message.iceCandidate);
      }
    }
  }
}
