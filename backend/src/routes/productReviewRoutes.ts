
import { Router } from 'express';
import { getProductReviews, addReview, getOrderReviews } from '../modules/customer/controllers/productReviewController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route to view reviews
router.get('/:productId', getProductReviews);

// Route to get reviews for a specific order
router.get('/order/:orderId', authenticate, getOrderReviews);

// Protected route to add review
router.post('/', authenticate, addReview);

export default router;
