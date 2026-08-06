import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import https from "https";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function download(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        resolve(false);
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(true)));
    }).on("error", () => {
      fs.unlink(dest, () => {});
      resolve(false);
    });
  });
}

async function main() {
  const listings = await db.listing.findMany();
  console.log(`Processing ${listings.length} listings...`);
  
  let updated = 0;
  for (const listing of listings) {
    const images: string[] = JSON.parse(listing.images);
    const thumbs: string[] = JSON.parse(listing.thumbs);
    
    const newImages: string[] = [];
    const newThumbs: string[] = [];
    let changed = false;
    
    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      if (url.startsWith("/uploads/")) {
        newImages.push(url);
        newThumbs.push(thumbs[i]?.startsWith("/uploads/") ? thumbs[i] : url);
        continue;
      }
      // Download
      const ext = url.includes(".png") ? "png" : "jpg";
      const filename = `${listing.slug}-${i}.${ext}`;
      const dest = path.join(UPLOADS_DIR, filename);
      const localUrl = `/uploads/${filename}`;
      
      if (!fs.existsSync(dest)) {
        const ok = await download(url, dest);
        if (!ok) {
          console.log(`  ✗ Failed: ${url}`);
          newImages.push(url); // keep original if download fails
          newThumbs.push(thumbs[i] || url);
          continue;
        }
      }
      newImages.push(localUrl);
      newThumbs.push(localUrl);
      changed = true;
    }
    
    if (changed) {
      await db.listing.update({
        where: { id: listing.id },
        data: {
          images: JSON.stringify(newImages),
          thumbs: JSON.stringify(newThumbs),
        },
      });
      updated++;
      console.log(`  ✓ ${listing.title.substring(0, 40)}...`);
    }
  }
  console.log(`\n✓ Updated ${updated} listings with local images`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
