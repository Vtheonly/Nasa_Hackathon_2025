const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const app = express();

// Serve all static files (html, css, client-side js) from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Serve the DZI files from the 'deepzoom-images' directory
app.use(
  "/deepzoom-images",
  express.static(path.join(__dirname, "deepzoom-images"))
);

// API endpoint to get the list of available DZI images for selectors
app.get("/api/images", async (req, res) => {
  const imagesPath = path.join(__dirname, "deepzoom-images");
  try {
    const directories = await fs.readdir(imagesPath, { withFileTypes: true });
    const imageList = [];
    for (const dirent of directories) {
      if (dirent.isDirectory()) {
        const imageName = dirent.name;
        // Find the .dzi file within the directory
        const dziFileName = (
          await fs.readdir(path.join(imagesPath, imageName))
        ).find((file) => file.endsWith(".dzi"));

        if (dziFileName) {
          // Create a nice display name (e.g., 'carina-nebula' -> 'Carina Nebula')
          const displayName = imageName
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          imageList.push({
            name: displayName,
            path: `/deepzoom-images/${imageName}/${dziFileName}`,
          });
        }
      }
    }
    res.json(imageList);
  } catch (error) {
    console.error("Error reading deepzoom-images directory:", error);
    res.status(500).json({ error: "Could not list images" });
  }
});

module.exports = app;
