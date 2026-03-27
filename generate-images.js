
const https = require('https');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set.');
    process.exit(1);
}

const prompts = [
    {
        filename: 'img-01.png',
        prompt: "Modern tech startup social media post for Instagram. Dark background (#0a0f0a), large bold white text 'Tu WhatsApp llena mesas', glowing emerald green accent color (#10b981), minimalist SaaS aesthetic, WhatsApp chat bubble floating in 3D, purple and amber gradient orbs in background, ultra clean premium design, inspired by Linear and Stripe branding, 1:1 square format, no text watermarks"
    },
    {
        filename: 'img-02.png',
        prompt: "Instagram carousel slide for SaaS restaurant tech product. Clean white background, bold black sans-serif typography, red crossed phone icon on left, emerald green checkmark on right, 'Antes vs Después' comparison layout, premium fintech aesthetic, inspired by Notion and Vercel design language, flat vector illustration style, 1:1 square"
    },
    {
        filename: 'img-03.png',
        prompt: "TikTok/Instagram reel thumbnail for AI restaurant reservation SaaS. Split screen: left side shows a stressed restaurant owner with ringing phone and paper chaos, right side shows same owner relaxed with clean smartphone showing WhatsApp confirmations, emerald green dividing line down center, bold text overlay space at top and bottom, cinematic quality, editorial magazine style, vibrant colors"
    },
    {
        filename: 'img-04.png',
        prompt: "Premium SaaS product announcement Instagram post. Deep navy background, floating smartphone mockup showing WhatsApp conversation with AI chatbot confirming restaurant reservation in Spanish, glowing emerald neon effects, geometric grid lines, minimal UI design elements floating around phone, Apple-quality product photography aesthetic, dark tech brand style, square format"
    },
    {
        filename: 'img-05.png',
        prompt: "Instagram story or post for restaurant management software. Warm amber and emerald color palette. Elegant Argentine restaurant atmosphere in background, blurred. Foreground: clean stats dashboard showing '0 reservas perdidas esta semana', bold modern typography, data visualization elements, luxury restaurant SaaS brand aesthetic, premium quality"
    },
    {
        filename: 'img-06.png',
        prompt: "Viral social media post design for B2B SaaS targeting restaurant owners in Argentina. Bold typography: 'En 10 minutos tu restaurante atiende reservas solo'. Emerald green and white color scheme, dark background, confetti or sparkle elements, trust badges (WhatsApp logo, AI icon), minimalist tech startup aesthetic, high contrast, Instagram-optimized"
    }
];

const imageDir = path.join(__dirname, 'marketing', 'assets');

async function generateAndSaveImage(item) {
    const { filename, prompt } = item;
    const filePath = path.join(imageDir, filename);

    const data = JSON.stringify({
        model: "dall-e-3",
        quality: "hd",
        style: "vivid",
        size: "1024x1024",
        n: 1,
        prompt: prompt
    });

    const options = {
        hostname: 'api.openai.com',
        path: '/v1/images/generations',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', async () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonResponse = JSON.parse(responseData);
                        const imageUrl = jsonResponse.data[0].url;
                        console.log(`Generated image URL for ${filename}: ${imageUrl}`);
                        await downloadImage(imageUrl, filePath);
                        resolve({ filename, success: true });
                    } catch (e) {
                        console.error(`Error parsing JSON or downloading image for ${filename}:`, e);
                        reject({ filename, success: false, error: e.message });
                    }
                } else {
                    console.error(`Error generating image for ${filename}: Status ${res.statusCode}, Response: ${responseData}`);
                    reject({ filename, success: false, error: responseData });
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Request error for ${filename}:`, e);
            reject({ filename, success: false, error: e.message });
        });

        req.write(data);
        req.end();
    });
}

async function downloadImage(url, filePath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`Downloaded ${filePath}`);
                    resolve();
                });
                fileStream.on('error', (err) => {
                    fs.unlink(filePath, () => {}); // Delete the file if an error occurs
                    reject(err);
                });
            } else {
                reject(new Error(`Failed to download image from ${url}. Status: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function runGenerations() {
    const results = [];
    for (const item of prompts) {
        let attempts = 0;
        let success = false;
        while (attempts < 2 && !success) { // Try once, then retry once
            try {
                const result = await generateAndSaveImage(item);
                results.push(result);
                success = true;
            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed for ${item.filename}. Retrying...`);
                attempts++;
                if (attempts === 2) {
                    results.push({ ...item, success: false, error: error.error || error.message });
                }
            }
        }
    }

    console.log('\n--- Image Generation Summary ---');
    let generatedFiles = [];
    for (const result of results) {
        if (result.success) {
            const filePath = path.join(imageDir, result.filename);
            const stats = fs.statSync(filePath);
            generatedFiles.push({ filename: result.filename, size: `${(stats.size / 1024).toFixed(2)} KB` });
            console.log(`✅ ${result.filename} generated and saved (${(stats.size / 1024).toFixed(2)} KB)`);
        } else {
            console.error(`❌ ${result.filename} failed: ${result.error}`);
        }
    }
    console.log('\n--- Generated Files ---');
    if (generatedFiles.length > 0) {
        generatedFiles.forEach(file => console.log(`${file.filename} (Size: ${file.size})`));
    } else {
        console.log('No images were successfully generated.');
    }
}

runGenerations();
