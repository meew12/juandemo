import { db } from "@/lib/db";

async function main() {
  // Fix Diseño (second image was broken)
  const diseno = await db.listing.findFirst({ where: { title: { contains: "Diseño de marca" } } });
  if (diseno) {
    const images = JSON.parse(diseno.images);
    const newImages = images.map((u: string) => u.includes("1561070791") ? "/uploads/diseno-2.jpg" : u);
    await db.listing.update({ where: { id: diseno.id }, data: { images: JSON.stringify(newImages), thumbs: JSON.stringify(newImages) } });
    console.log("✓ Fixed diseño images");
  }
  
  // Fix Carpintería (second image was broken)
  const carp = await db.listing.findFirst({ where: { title: { contains: "Carpintería" } } });
  if (carp) {
    const images = JSON.parse(carp.images);
    const newImages = images.map((u: string) => u.includes("1611288875785") ? "/uploads/carpinteria-2.jpg" : u);
    await db.listing.update({ where: { id: carp.id }, data: { images: JSON.stringify(newImages), thumbs: JSON.stringify(newImages) } });
    console.log("✓ Fixed carpintería images");
  }
  
  // Fix Educación (first image was broken)
  const edu = await db.listing.findFirst({ where: { title: { contains: "Clases particulares" } } });
  if (edu) {
    const images = JSON.parse(edu.images);
    const newImages = images.map((u: string) => u.includes("1503676260728") ? "/uploads/educacion-1.jpg" : u);
    await db.listing.update({ where: { id: edu.id }, data: { images: JSON.stringify(newImages), thumbs: JSON.stringify(newImages) } });
    console.log("✓ Fixed educación images");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
