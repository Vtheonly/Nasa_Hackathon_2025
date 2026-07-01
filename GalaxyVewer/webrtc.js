document.addEventListener("DOMContentLoaded", () => {
  const startStreamButton = document.getElementById("start-stream");
  const localVideo = document.getElementById("local-video");

  let localStream;
  let peerConnection;
  const ws = new WebSocket("ws://localhost:8765");

  const servers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
  };

  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);

    if (message.offer) {
      peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      ws.send(JSON.stringify({ answer: peerConnection.localDescription }));
    }

    if (message.answer) {
      peerConnection.setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    }

    if (message.iceCandidate) {
      peerConnection.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
    }
  };

  if (startStreamButton) {
    startStreamButton.addEventListener("click", async () => {
      try {
        localStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        if (localVideo) {
          localVideo.srcObject = localStream;
        }

        // Create a new RTCPeerConnection
        peerConnection = new RTCPeerConnection(servers);

        // Add the local stream to the peer connection
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            ws.send(JSON.stringify({ iceCandidate: event.candidate }));
          }
        };

        // Create an offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        ws.send(JSON.stringify({ offer: peerConnection.localDescription }));
      } catch (error) {
        console.error("Error accessing display media.", error);
      }
    });
  }
});
