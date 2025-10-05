document.addEventListener("DOMContentLoaded", () => {
  const remoteVideo = document.getElementById("remote-video");
  const statusElement = document.getElementById("status");
  const joinContainer = document.getElementById("join-container");
  const roomCodeInput = document.getElementById("room-code");
  const joinButton = document.getElementById("join-room");

  const videoViewer = new Viewer(remoteVideo, statusElement, joinContainer);

  joinButton.addEventListener("click", () => {
    const roomCode = roomCodeInput.value;
    videoViewer.joinRoom(roomCode);
  });

  roomCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const roomCode = roomCodeInput.value;
      videoViewer.joinRoom(roomCode);
    }
  });
});
