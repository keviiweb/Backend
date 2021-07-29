const { Router, json } = require("express");
const {
  approveBookingRequestController,
} = require("../controllers/bookingRequest/approveBookingRequest.controller");
const {
  createBookingRequestController,
} = require("../controllers/bookingRequest/createBookingRequest.controller");
const { dummyAuthMiddleware } = require("../middlewares/dummyAuth.middleware");
const {
  getBookingRequestInfo,
} = require("../controllers/bookingRequest/getBookingRequestInfo.controller");
const {
  bookingRequestSchema,
  approveBookingRequestSchema,
  getBookingRequestSchema,
} = require("../schema/bookingRequestSchema");
const { validationHelper } = require("../utils/requestValidationTool");

const router = Router();

router.use(json());

router.get("/ping", (req, res, next) => {
  return res.send("Successfully inside booking request routes");
});

router.get(
  "/",
  validationHelper(getBookingRequestSchema, "query"),
  getBookingRequestInfo
);

router.post(
  "/approve",
  dummyAuthMiddleware,
  validationHelper(approveBookingRequestSchema, "body"),
  approveBookingRequestController
);

module.exports = router;
