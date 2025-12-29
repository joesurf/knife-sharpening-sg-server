import express from 'express';
import multer from 'multer';
import { putToS3 } from '../utils/aws_helper.js'
import { sendMessageToTelegramNotifications, createCollectionNotificationMessage, createDeliveryNotificationMessage } from '../utils/telegram_helper.js';
import { sendCollectedMessage, sendDeliveredMessage } from '../utils/botspace_helper.js';
import { getNotionOrderIdByOrderNumber, updateNotionOrderCollected, updateNotionOrderDelivered } from '../utils/notion_helper.ts';

const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.render('index', { title: 'Express' });
});

/* Testing Route */
router.get('/test', (req, res) => {
  res.render('index', { title: 'Test' });
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/collection-picture', upload.single("image"), async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const buffer = req.file?.buffer; // Buffer with file bytes
    const mimetype = req.file?.mimetype;
    const imageUrl = await putToS3({ key: `orders/${orderId}/collection/${req.file?.originalname}`, body: buffer, contentType: mimetype });

    getNotionOrderIdByOrderNumber(orderId).then((orderId) => {
      updateNotionOrderCollected(orderId, true);
    });
    sendMessageToTelegramNotifications(createCollectionNotificationMessage(orderId, imageUrl));
    sendCollectedMessage(orderId, imageUrl);

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    return res.json({
      ok: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err?.message ?? "Upload failed" });
  }
})

router.post('/delivery-picture', upload.single("image"), async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const buffer = req.file?.buffer; // Buffer with file bytes
    const mimetype = req.file?.mimetype;
    const imageUrl = await putToS3({ key: `orders/${orderId}/delivery/${req.file?.originalname}`, body: buffer, contentType: mimetype });

    getNotionOrderIdByOrderNumber(orderId).then((orderId) => {
      updateNotionOrderDelivered(orderId, true);
    });
    sendMessageToTelegramNotifications(createDeliveryNotificationMessage(orderId, imageUrl));
    sendDeliveredMessage(orderId, imageUrl);

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    return res.json({
      ok: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err?.message ?? "Upload failed" });
  }
})

export default router;
