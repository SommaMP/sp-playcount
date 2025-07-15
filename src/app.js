// src/app.js
import express from 'express';
import albumRouter from './routes/album.js';
import spotifyService from './services/spotifyService.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/album', albumRouter);

app.listen(PORT, async () => {
    await spotifyService.refreshToken();
    setInterval(spotifyService.refreshToken, 15 * 60 * 1000);
    console.log(`Server listening on port ${PORT}`);
});
