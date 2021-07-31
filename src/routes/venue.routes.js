const { Router, json } = require("express");
const {
  createChildVenueController,
} = require("../controllers/venue/createChildVenue.controller");
const {
  createVenueController,
} = require("../controllers/venue/createVenue.controller");
const {
  getAllVenueController,
} = require("../controllers/venue/getAllVenue.controller");
const {
  getAllVenueAdminController,
} = require("../controllers/venue/getAllVenueAdmin.controller");
const {
  updateVenueVisibilityController,
} = require("../controllers/venue/updateVenueVisibility.controller");
const { dummyAuthMiddleware } = require("../middlewares/dummyAuth.middleware");
const {
  createVenueSchema,
  createChildVenueSchema,
  updateVenueVisibilitySchema,
} = require("../schema/venueSchema");
const { validationHelper } = require("../utils/requestValidationTool");

const router = Router();

router.use(json());

router.get("/ping", (req, res, next) => {
  return res.send("Successfully inside venue routes");
});

router.get("/search", getAllVenueController);

router.get("/admin/search", dummyAuthMiddleware, getAllVenueAdminController);

router.post(
  "/",
  dummyAuthMiddleware,
  validationHelper(createVenueSchema, "body"),
  createVenueController
);

router.post(
  "/childVenue/:parentId",
  dummyAuthMiddleware,
  validationHelper(createChildVenueSchema, "body"),
  createChildVenueController
);

router.put(
  "/visibility/:venueId",
  dummyAuthMiddleware,
  validationHelper(updateVenueVisibilitySchema, "params"),
  updateVenueVisibilityController
);

module.exports = router;
