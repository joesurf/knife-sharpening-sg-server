import express from 'express';

const router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

/* Testing Route */
router.get('/test', (req, res, next) => {
  res.render('index', { title: 'Test' });
  console.log('test');
});

export default router;
