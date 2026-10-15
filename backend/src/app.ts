import express from "express";
import authRoutes from "./routes/authRoutes";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to HomeMaintain API",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "HomeMaintain API",
  });
});

app.use("/api/auth", authRoutes);

export default app;