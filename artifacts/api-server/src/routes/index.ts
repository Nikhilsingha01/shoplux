import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import bannersRouter from "./banners";
import ordersRouter from "./orders";
import addressesRouter from "./addresses";
import wishlistRouter from "./wishlist";
import couponsRouter from "./coupons";
import adminRouter from "./admin";
import supportRouter from "./support";
import reviewsRouter from "./reviews";
import flashSalesRouter from "./flash-sales";
import testimonialsRouter from "./testimonials";
import chatbotRouter from "./chatbot";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(bannersRouter);
router.use(ordersRouter);
router.use(addressesRouter);
router.use(wishlistRouter);
router.use(couponsRouter);
router.use(adminRouter);
router.use(supportRouter);
router.use(reviewsRouter);
router.use(flashSalesRouter);
router.use(testimonialsRouter);
router.use(chatbotRouter);

export default router;

