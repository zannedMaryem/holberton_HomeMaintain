import { Router } from "express";
import {
  deleteRentalBooking,
  deleteRental,
  getRentalDates,
  listMyRentals,
  listRentals,
  patchRentalActive,
  patchRentalBooking,
  postRental,
  postRentalBooking,
  putRental,
  validateRentalBookingId,
  validateRentalId,
} from "../controllers/rentalController";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";

const router = Router();
const rentalUsers = ["homeowner", "technician"] as const;

router.param("rentalId", validateRentalId);
router.param("bookingId", validateRentalBookingId);
router.get("/", authenticate, authorize(...rentalUsers), listRentals);
router.get("/mine", authenticate, authorize(...rentalUsers), listMyRentals);
router.post("/", authenticate, authorize(...rentalUsers), postRental);
router.get(
  "/:rentalId/availability",
  authenticate,
  authorize(...rentalUsers),
  getRentalDates,
);
router.post(
  "/:rentalId/bookings",
  authenticate,
  authorize(...rentalUsers),
  postRentalBooking,
);
router.patch(
  "/:rentalId/bookings/:bookingId",
  authenticate,
  authorize(...rentalUsers),
  patchRentalBooking,
);
router.delete(
  "/:rentalId/bookings/:bookingId",
  authenticate,
  authorize(...rentalUsers),
  deleteRentalBooking,
);
router.patch(
  "/:rentalId/active",
  authenticate,
  authorize(...rentalUsers),
  patchRentalActive,
);
router.put("/:rentalId", authenticate, authorize(...rentalUsers), putRental);
router.delete("/:rentalId", authenticate, authorize(...rentalUsers), deleteRental);

export default router;
