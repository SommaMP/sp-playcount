import fetch from 'node-fetch';
import base64 from 'base-64';
import { totp } from 'otplib';

const SPOTIFY_WEB_URL = "https://open.spotify.com";
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
const CIPHER = [12, 56, 76, 33, 88, 44, 88, 33, 78, 78, 11, 66, 22, 22, 55, 69, 54];
const PROCESSED_CIPHER = CIPHER.map((c, i) => c ^ (i % 33 + 9)).join('');
const CIPHER_BYTES = Buffer.from(PROCESSED_CIPHER, 'ascii');

let accessToken = null;
let clientId = null;
let accessTokenExpiration = 0;
const cache = new Map();

async function refreshToken() {
    const secret = base64.encode(CIPHER_BYTES).replace(/=+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const totpCode = totp.generate(secret, { timestamp: now * 1000 });
    const params = new URLSearchParams({
        reason: "transport",
        productType: "web-player",
        totp: totpCode,
        totpVer: 5
    });
    const response = await fetch(`https://open.spotify.com/api/token?${params.toString()}`);
    const access_token_json = await response.json();
    console.log(access_token_json);
    accessToken = access_token_json.accessToken;
    clientId = access_token_json.clientId;
    accessTokenExpiration = access_token_json.accessTokenExpirationTimestampMs;
}

async function getAlbum(id) {
    // Cache per 6 ore
    const cacheKey = `album:${id}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
        return cached.data;
    }

    if (!accessToken || Date.now() > accessTokenExpiration) {
        await refreshToken();
    }

    const headers = {
        "accept": "application/json",
        "app-platform": "WebPlayer",
        "content-type": "application/json",
        "origin": SPOTIFY_WEB_URL,
        "referer": SPOTIFY_WEB_URL + "/",
        "user-agent": USER_AGENT,
        "authorization": "Bearer " + accessToken
    };

    // Qui va la tua query GQL per album
    const body = {
        operationName: "getAlbum",
        variables: {
            uri: "spotify:album:" + id,
            locale: "",
            offset: 0,
            limit: 50
        },
        query: `query getAlbum($uri: ID!, $locale: String, $offset: Int, $limit: Int) {
          albumUnion(uri: $uri) {
            __typename
            ... on Album {
              uri
              name
              // ...altri campi che vuoi
            }
          }
        }`
    };

    const res = await fetch("https://api.spotify.com/v1/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });
    const data = await res.json();

    // Controllo errori e caching
    if (!data.data || !data.data.albumUnion || data.data.albumUnion.__typename === "NotFound") {
        throw new Error(data.error.message);
    }
    cache.set(cacheKey, { data: data.data.albumUnion, expires: Date.now() + 6 * 60 * 60 * 1000 });
    return data.data.albumUnion;
}

export default {
    getAlbum,
    refreshToken
};