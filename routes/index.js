import express from 'express';
import multer from 'multer';

const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.render('index', { title: 'Express' });
});

/* Testing Route */
router.get('/test', (req, res) => {
  res.render('index', { title: 'Test' });
  console.log('test');
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/collection-picture', upload.single("image"), async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const buffer = req.file?.buffer; // Buffer with file bytes
    const mimetype = req.file?.mimetype;
    // await putToS3({ key: `orders/${orderId}/${req.file?.originalname}`, body: buffer, contentType: mimetype });
    console.log(orderId, buffer, mimetype);

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
