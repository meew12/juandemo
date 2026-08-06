import { db } from "@/lib/db";

async function main() {
  const users = await db.user.findMany();
  console.log(`Found ${users.length} users`);
  
  let count = 0;
  for (const user of users) {
    // Skip if already has notifications
    const existing = await db.notification.count({ where: { userId: user.id } });
    if (existing > 0) continue;
    
    // Create 2-3 demo notifications per user
    const notifs = [
      {
        userId: user.id,
        type: "system",
        title: "¡Bienvenido a UMPI! 🎉",
        body: "Tu cuenta está lista. Empezá a publicar o explorar miles de avisos en toda Argentina.",
        link: "/?page=home",
        read: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        type: "review",
        title: "Nueva reseña recibida ⭐",
        body: "Un usuario dejó una reseña de 5★ en tu publicación",
        link: "/?page=perfil",
        read: Math.random() > 0.5,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        type: "message",
        title: "Nuevo mensaje recibido 💬",
        body: "Tenés un nuevo mensaje sobre tu publicación",
        link: "/?page=mensajes",
        read: Math.random() > 0.5,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    ];
    
    for (const n of notifs) {
      await db.notification.create({ data: n });
      count++;
    }
  }
  console.log(`✓ Created ${count} notifications`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
