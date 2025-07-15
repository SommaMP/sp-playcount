// src/controllers/albumController.js
import spotifyService from '../services/spotifyService.js';

export async function getAlbum(req, res) {
    const id = req.query.id;
    if (!id || id.length !== 22) {
        return res.status(400).json({ success: false, data: "id must have a length of 22 characters" });
    }
    try {
        const album = await spotifyService.getAlbum(id);
        res.json({ success: true, data: album });
    } catch (e) {
        res.status(404).json({ success: false, data: e.message });
    }
}