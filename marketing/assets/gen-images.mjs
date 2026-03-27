import https from 'https';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.OPENAI_API_KEY;
const OUT_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

const prompts = [
  {
    name: 'post-01-hero',
    prompt: `Premium SaaS marketing post for Instagram, 1:1 square format. Dark emerald green and deep navy background. Bold white typography reading "Tu WhatsApp ahora reserva solo". Floating WhatsApp chat bubble UI mockup showing an AI reservation conversation. Minimalist tech aesthetic inspired by Linear, Vercel, Stripe design. Glowing emerald accents, subtle grid lines, floating particles. Bottom shows "ReservasAI" logo and "Probá gratis 14 días". Ultra-premium, Apple-level design quality. No people. Clean, modern, bold.`
  },
  {
    name: 'post-02-noshows',
    prompt: `Instagram post for a restaurant SaaS product. Split composition: left side dark red with an empty restaurant table with a "Reservado" sign and no one sitting, right side emerald green with a full happy table. Bold text overlay: "Antes: mesa vacía / Después: mesa llena". Premium editorial design style like Notion or Figma marketing. Stats badge showing "-40% no-shows". Clean sans-serif typography. Bottom branding: ReservasAI.`
  },
  {
    name: 'post-03-stats',
    prompt: `Ultra-modern data visualization Instagram post for a tech SaaS brand. Dark background with subtle gradient. Three large stat cards floating with glassmorphism effect: "2.000+ reservas/mes", "Respuesta en 3 seg", "24/7 disponible". WhatsApp green color (#25D366) accents mixed with emerald. Typography inspired by Figma, Linear. Small text: "ReservasAI — Reservas por WhatsApp con IA". Cinematic lighting, premium quality, no people.`
  },
  {
    name: 'post-04-comparison',
    prompt: `Side by side comparison Instagram post, square format. Left side labeled "Sin ReservasAI": chaotic sticky notes, missed calls counter, stressed emoji, paper reservations. Right side labeled "Con ReservasAI": clean dashboard UI, WhatsApp chat showing confirmed reservation, green checkmarks, calm organized. Bold headline: "¿Por qué seguir perdiendo reservas?". Colors: dark navy/charcoal left, emerald/white right. Premium SaaS marketing visual style.`
  }
];

async function generateImage(prompt, name) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid'
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const url = json.data[0].url;
          resolve({ name, url });
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(OUT_DIR, filename));
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

console.log('🎨 Generando imágenes con DALL-E 3...\n');

for (const p of prompts) {
  try {
    console.log(`⏳ Generando: ${p.name}...`);
    const result = await generateImage(p.prompt, p.name);
    const filename = `${p.name}.png`;
    await downloadImage(result.url, filename);
    console.log(`✅ Guardado: ${filename}`);
  } catch(e) {
    console.error(`❌ Error en ${p.name}: ${e.message}`);
  }
}

console.log('\n🎉 ¡Listo! Imágenes en marketing/assets/');
