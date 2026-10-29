import express from "express";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes"

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
app.use("/api/users", userRoutes);

export default app;