import express from "express";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import adminUserRoutes from "./routes/adminUserRoutes";
import jobRoutes from "./routes/jobRoutes";
import jobCategoryRoutes from "./routes/jobCategoryRoutes";
import governorateRoutes from "./routes/governorateRoutes";

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
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/job-categories", jobCategoryRoutes);
app.use("/api/governorates", governorateRoutes);
app.use("/api/jobs", jobRoutes);


export default app;