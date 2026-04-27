import { createServer } from "http";
import next from "next";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const port = process.env.PORT || 7015; // Set the port from environment variables or default to 7002
const dev = process.env.NODE_ENV !== "production"; // Check if we are in development mode
const app = next({ dev });
const handle = app.getRequestHandler(); // Get the default request handler for Next.js

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res); // Handle the requests
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`); // Log that the server is ready
    });
  })
  .catch((err) => {
    console.error("Error starting server:", err); // Log any errors
    process.exit(1); // Exit the process if there's an error
  });
