// src/routes/album.js
import express from 'express';
import { getAlbum } from '../controllers/albumController.js';

const router = express.Router();

router.get('/', getAlbum);

export default router;