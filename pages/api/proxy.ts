// pages/api/proxy.ts

import type { NextApiRequest, NextApiResponse } from "next"

const BACKEND_URL = "https://smart-faq-backend.onrender.com"  // <-- your Render backend

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const targetUrl = BACKEND_URL + req.url!.replace("/api/proxy", "")

    try {
        const proxyRes = await fetch(targetUrl, {
            method: req.method,
            headers: {
                "Content-Type": req.headers["content-type"] || "application/json",
                ...(req.headers.authorization && { "Authorization": req.headers.authorization }),
            },
            body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
        })

        const data = await proxyRes.text()

        res.status(proxyRes.status).send(data)
    } catch (err) {
        console.error("Proxy error:", err)
        res.status(500).json({ error: "Proxy error" })
    }
}
