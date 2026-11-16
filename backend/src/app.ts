import express from "express";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import adminUserRoutes from "./routes/adminUserRoutes";
import jobRoutes from "./routes/jobRoutes";
import governorateRoutes from "./routes/governorateRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import technicianRoutes from "./routes/technicianRoutes";
import rentalRoutes from "./routes/rentalRoutes";

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
app.use("/api/governorates", governorateRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/job-categories", serviceRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/rentals", rentalRoutes);


export default app;