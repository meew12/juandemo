import { db } from "@/lib/db";

async function main() {
  const listing = await db.listing.findFirst({
    where: { title: { contains: "Carpintería" } },
  });
  if (!listing) {
    console.log("Listing not found");
    return;
  }
  console.log("Found listing:", listing.title);
  
  const images = JSON.parse(listing.images);
  const thumbs = JSON.parse(listing.thumbs);
  const newImages = images.map((url: string) => 
    url.includes("1504148455328-c376907d081c") 
      ? "/uploads/carpinteria.jpg" 
      : url
  );
  const newThumbs = thumbs.map((url: string) => 
    url.includes("1504148455328-c376907d081c") 
      ? "/uploads/carpinteria.jpg" 
      : url
  );
  
  await db.listing.update({
    where: { id: listing.id },
    data: {
      images: JSON.stringify(newImages),
      thumbs: JSON.stringify(newThumbs),
    },
  });
  console.log("✓ Updated images to:", newImages);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
