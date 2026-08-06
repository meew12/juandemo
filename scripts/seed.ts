import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils-umpi";

const SAMPLE_IMAGES = {
  tech: [
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
  ],
  diseno: [
    "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80",
    "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80",
  ],
  marketing: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800&q=80",
  ],
  plomeria: [
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80",
    "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80",
  ],
  electricidad: [
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  ],
  carpinteria: [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80",
    "https://images.unsplash.com/photo-1611288875785-f0e9f3b8d96c?w=800&q=80",
  ],
  educacion: [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a52?w=800&q=80",
    "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&q=80",
  ],
  fotografia: [
    "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80",
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
  ],
  contabilidad: [
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
  ],
  musica: [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
    "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80",
  ],
  auto: [
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
    "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
  ],
  propiedad: [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
  ],
};

async function main() {
  console.log("🌱 Seeding UMPI database...");

  // ─── Planes ───
  const plans = [
    { slug: "basico", name: "Básico", price: 0, description: "Para empezar a publicar en UMPI", features: JSON.stringify(["Publicaciones estándar","Búsqueda y filtros básicos","Mensajes ilimitados","1 publicación activa"]), maxListings: 1, maxFeatured: 0, badgeVerified: false, top10Access: false, multiUser: 1, apiAccess: false, prioritySupport: false, monthlyReport: false, invoiceType: null, order: 0 },
    { slug: "pro", name: "Pro", price: 7990, description: "Para profesionales que quieren crecer", features: JSON.stringify(["Todo lo de Básico","Acceso al Top 10 semanal","5 publicaciones activas","2 destacados por mes","Alertas por email","Badge verificado en tu perfil","Estadísticas avanzadas","Soporte prioritario por chat"]), maxListings: 5, maxFeatured: 2, badgeVerified: true, top10Access: true, multiUser: 1, apiAccess: false, prioritySupport: true, monthlyReport: false, invoiceType: "B", order: 1 },
    { slug: "business", name: "Business", price: 24990, description: "Para empresas y vendedores profesionales", features: JSON.stringify(["Todo lo de Pro","Publicaciones ilimitadas","10 destacados por mes","Panel multi-usuario (5 usuarios)","Acceso a la API","Reportes mensuales","Gerente dedicado","Factura A"]), maxListings: 9999, maxFeatured: 10, badgeVerified: true, top10Access: true, multiUser: 5, apiAccess: true, prioritySupport: true, monthlyReport: true, invoiceType: "A", order: 2 },
  ];
  for (const plan of plans) {
    await db.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
  }
  console.log("✓ Planes creados");

  // ─── Categorías ───
  const categories = [
    { slug: "tecnologia", name: "Tecnología", type: "servicio", count: 342, order: 0 },
    { slug: "diseno", name: "Diseño", type: "servicio", count: 218, order: 1 },
    { slug: "marketing", name: "Marketing", type: "servicio", count: 189, order: 2 },
    { slug: "plomeria", name: "Plomería", type: "servicio", count: 97, order: 3 },
    { slug: "electricidad", name: "Electricidad", type: "servicio", count: 134, order: 4 },
    { slug: "carpinteria", name: "Carpintería", type: "servicio", count: 76, order: 5 },
    { slug: "educacion", name: "Clases y Educación", type: "servicio", count: 203, order: 6 },
    { slug: "fotografia", name: "Fotografía", type: "servicio", count: 89, order: 7 },
    { slug: "contabilidad", name: "Contabilidad", type: "servicio", count: 112, order: 8 },
    { slug: "musica", name: "Música", type: "servicio", count: 64, order: 9 },
    { slug: "toyota", name: "Toyota", type: "auto", count: 428, order: 0 },
    { slug: "volkswagen", name: "Volkswagen", type: "auto", count: 312, order: 1 },
    { slug: "ford", name: "Ford", type: "auto", count: 289, order: 2 },
    { slug: "renault", name: "Renault", type: "auto", count: 254, order: 3 },
    { slug: "peugeot", name: "Peugeot", type: "auto", count: 198, order: 4 },
    { slug: "honda", name: "Honda", type: "auto", count: 176, order: 5 },
    { slug: "chevrolet", name: "Chevrolet", type: "auto", count: 143, order: 6 },
    { slug: "jeep", name: "Jeep", type: "auto", count: 87, order: 7 },
    { slug: "departamento", name: "Departamento", type: "propiedad", count: 2840, order: 0 },
    { slug: "casa", name: "Casa", type: "propiedad", count: 1920, order: 1 },
    { slug: "ph", name: "PH", type: "propiedad", count: 890, order: 2 },
    { slug: "local-comercial", name: "Local comercial", type: "propiedad", count: 340, order: 3 },
    { slug: "terreno", name: "Terreno", type: "propiedad", count: 110, order: 4 },
    { slug: "oficina", name: "Oficina", type: "propiedad", count: 220, order: 5 },
    { slug: "quinta", name: "Quinta", type: "propiedad", count: 95, order: 6 },
    { slug: "studio", name: "Studio", type: "propiedad", count: 78, order: 7 },
  ];
  for (const cat of categories) {
    await db.category.upsert({ where: { slug: cat.slug }, update: cat, create: cat });
  }
  console.log("✓ Categorías creadas");

  // ─── Usuarios demo ───
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@umpi.com.ar" },
    update: {},
    create: {
      email: "admin@umpi.com.ar",
      name: "Admin",
      lastName: "UMPI",
      passwordHash: adminPassword,
      role: "admin",
      plan: "business",
      verified: true,
      zone: "CABA — Microcentro",
      phone: "+54 11 5555-5555",
      avatarInitials: "AU",
      bio: "Administrador de UMPI",
    },
  });

  const demoUser = await db.user.upsert({
    where: { email: "juan.garcia@email.com" },
    update: {},
    create: {
      email: "juan.garcia@email.com",
      name: "Juan",
      lastName: "García",
      passwordHash: userPassword,
      role: "user",
      plan: "pro",
      verified: true,
      zone: "CABA — Palermo",
      phone: "+54 11 1234-5678",
      avatarInitials: "JG",
      bio: "Desarrollador web freelance especializado en React y Next.js.",
    },
  });

  const sellerData = [
    { name: "María", lastName: "González", email: "maria.gonzalez@email.com", zone: "CABA — Belgrano", plan: "pro", verified: true },
    { name: "Carlos", lastName: "Méndez", email: "carlos.mendez@email.com", zone: "GBA Norte", plan: "business", verified: true },
    { name: "Ana", lastName: "Rodríguez", email: "ana.rodriguez@email.com", zone: "CABA — Caballito", plan: "basico", verified: false },
    { name: "Pablo", lastName: "Fernández", email: "pablo.fernandez@email.com", zone: "Córdoba Capital", plan: "pro", verified: true },
    { name: "Lucía", lastName: "Sosa", email: "lucia.sosa@email.com", zone: "Rosario", plan: "basico", verified: false },
    { name: "Diego", lastName: "López", email: "diego.lopez@email.com", zone: "GBA Sur", plan: "pro", verified: true },
    { name: "Sofía", lastName: "Romero", email: "sofia.romero@email.com", zone: "Mendoza Capital", plan: "business", verified: true },
    { name: "Martín", lastName: "Pérez", email: "martin.perez@email.com", zone: "CABA — Palermo Soho", plan: "pro", verified: true },
    { name: "Claudia", lastName: "López", email: "claudia.lopez@email.com", zone: "CABA — Puerto Madero", plan: "business", verified: true },
    { name: "Fernando", lastName: "Díaz", email: "fernando.diaz@email.com", zone: "GBA Oeste", plan: "basico", verified: false },
  ];
  const sellers: any[] = [];
  for (const s of sellerData) {
    const seller = await db.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        ...s,
        passwordHash: userPassword,
        role: "user",
        avatarInitials: (s.name[0] + s.lastName[0]).toUpperCase(),
        phone: `+54 11 ${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      },
    });
    sellers.push(seller);
  }
  console.log("✓ Usuarios creados");
  const allSellers = [demoUser, ...sellers];

  // ─── Publicaciones de ejemplo ───
  const existingListings = await db.listing.count();
  if (existingListings > 0) {
    console.log(`ℹ️  Ya existen ${existingListings} publicaciones, saltando...`);
  } else {
    const servicios = [
      { title: "Desarrollo web a medida en React y Next.js", description: "Desarrollo de aplicaciones web modernas con React, Next.js y TypeScript. Incluye diseño responsivo, SEO optimizado y deployment. Más de 8 años de experiencia.", categorySlug: "tecnologia", price: 18000, priceUnit: "hora", location: "CABA — Palermo", zone: "CABA", attrs: { Experiencia: "8 años", Stack: "React, Next.js, TypeScript", Disponibilidad: "Remoto o presencial" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 47, views: 1247 },
      { title: "Diseño de marca e identidad visual completa", description: "Diseño de logo, paleta de colores, tipografías y manual de marca. Incluye 3 propuestas y rondas de ajustes.", categorySlug: "diseno", price: 85000, priceUnit: "unico", location: "CABA — Palermo Soho", zone: "CABA", attrs: { Entrega: "7-10 días", Formatos: "AI, PDF, PNG, SVG", Revisiones: "3 incluidas" }, badge: "featured", featured: true, rating: 4.9, reviewCount: 32, views: 892 },
      { title: "Marketing digital y campañas en redes sociales", description: "Gestión completa de redes sociales, Meta Ads y Google Ads. Estrategia de contenido, community management y reportes mensuales.", categorySlug: "marketing", price: 65000, priceUnit: "mes", location: "Remoto", zone: "Remoto", attrs: { Plataformas: "Instagram, Facebook, Google", Incluye: "3 publicaciones/semana", Reportes: "Mensual" }, badge: "hot", rating: 4.8, reviewCount: 28, views: 654 },
      { title: "Plomero matriculado — Urgencias 24hs", description: "Servicio de plomería para reparaciones, destapaciones e instalaciones. Atiendo urgencias las 24 horas. Presupuesto sin cargo.", categorySlug: "plomeria", price: 12000, priceUnit: "unico", location: "CABA — Caballito", zone: "CABA", attrs: { Disponibilidad: "24 horas", Matrículado: "Sí", Zona: "CABA y GBA" }, badge: "new", rating: 4.9, reviewCount: 156, views: 2103 },
      { title: "Electricista certificado — Instalaciones y reparaciones", description: "Instalaciones eléctricas domiciliarias y comerciales. Tableros, iluminación LED, aire acondicionado. Garantía escrita.", categorySlug: "electricidad", price: 15000, priceUnit: "unico", location: "GBA Norte — San Isidro", zone: "GBA Norte", attrs: { Certificado: "Matrícula N° 4521", Garantía: "6 meses", Urgencias: "Sí" }, rating: 4.7, reviewCount: 89, views: 1567 },
      { title: "Carpintería a medida — Muebles y amoblamientos", description: "Diseño y fabricación de muebles a medida. Cocinas, placares, escritorios. Trabajo en melamina, madera maciza y MDF.", categorySlug: "carpinteria", price: 250000, priceUnit: "unico", location: "GBA Oeste — Morón", zone: "GBA Oeste", attrs: { Materiales: "Melamina, Madera, MDF", Entrega: "15-20 días", Garantía: "1 año" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 41, views: 743 },
      { title: "Clases particulares de matemáticas y física", description: "Profesor universitario dicta clases particulares de matemática y física para secundario y CBC. Material incluido, clases online o presenciales.", categorySlug: "educacion", price: 4500, priceUnit: "hora", location: "CABA — Belgrano", zone: "CABA", attrs: { Nivel: "Secundario y Universitario", Modalidad: "Online o presencial", Material: "Incluido" }, rating: 4.9, reviewCount: 67, views: 1102 },
      { title: "Fotografía profesional para eventos y productos", description: "Sesiones de fotos para casamientos, cumpleaños, productos para e-commerce y contenido para redes. Edición incluida.", categorySlug: "fotografia", price: 45000, priceUnit: "unico", location: "CABA — Microcentro", zone: "CABA", attrs: { Equipos: "Canon R5, lentes profesionales", Entrega: "5-7 días", Fotos: "200+ editadas" }, badge: "hot", rating: 4.8, reviewCount: 54, views: 689 },
      { title: "Contador público — Impuestos y monotributo", description: "Asesoramiento impositivo, contable y laboral. Monotributo, IVA, ganancias, sueldos. Facturación y balances.", categorySlug: "contabilidad", price: 35000, priceUnit: "mes", location: "CABA — Microcentro", zone: "CABA", attrs: { Servicios: "Impositivo, Contable, Laboral", Matriculado: "CPCECABA", Software: "Incluido" }, rating: 4.9, reviewCount: 112, views: 1834 },
      { title: "Profesor de guitarra y producción musical", description: "Clases de guitarra eléctrica y acústica para todos los niveles. Producción musical en home studio. Blues, rock, jazz.", categorySlug: "musica", price: 3800, priceUnit: "hora", location: "Remoto", zone: "Remoto", attrs: { Niveles: "Inicial a avanzado", Estilos: "Rock, Blues, Jazz", Modalidad: "Online o presencial" }, rating: 5.0, reviewCount: 23, views: 412 },
      { title: "Desarrollo de e-commerce con Shopify y WooCommerce", description: "Tiendas online completas con Shopify o WooCommerce. Integración con Mercado Pago, pasarelas de pago y logística.", categorySlug: "tecnologia", price: 320000, priceUnit: "unico", location: "Remoto", zone: "Remoto", attrs: { Plataformas: "Shopify, WooCommerce", Incluye: "Diseño + Desarrollo", Soporte: "30 días" }, rating: 4.9, reviewCount: 38, views: 921 },
    ];
    for (const s of servicios) {
      const seller = allSellers[Math.floor(Math.random() * allSellers.length)];
      const cat = await db.category.findUnique({ where: { slug: s.categorySlug } });
      const imgKey = s.categorySlug as keyof typeof SAMPLE_IMAGES;
      const imgs = SAMPLE_IMAGES[imgKey] || SAMPLE_IMAGES.tech;
      await db.listing.create({
        data: {
          slug: `${slugify(s.title)}-${Math.random().toString(36).substring(2, 7)}`,
          title: s.title,
          description: s.description,
          categoryType: "servicio",
          categoryId: cat?.id,
          price: s.price,
          currency: "ARS",
          priceUnit: s.priceUnit,
          location: s.location,
          zone: s.zone,
          province: s.zone,
          images: JSON.stringify([imgs[0], imgs[1] || imgs[0]]),
          thumbs: JSON.stringify([imgs[0], imgs[1] || imgs[0]]),
          attrs: JSON.stringify(s.attrs),
          rating: s.rating,
          reviewCount: s.reviewCount,
          views: s.views,
          badge: s.badge || null,
          featured: s.featured || false,
          featuredUntil: s.featured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          boostLevel: s.featured ? 2 : 0,
          status: "active",
          sellerId: seller.id,
        },
      });
    }
    console.log(`✓ ${servicios.length} servicios creados`);

    const autos = [
      { title: "Toyota Corolla XEI 2022", categorySlug: "toyota", price: 28500000, location: "CABA — Villa Urquiza", zone: "CABA", attrs: { Marca: "Toyota", Modelo: "Corolla XEI", Año: 2022, Km: 28000, Combustible: "Nafta", Caja: "Automática" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 12, views: 3421 },
      { title: "Volkswagen Golf GTI 2021", categorySlug: "volkswagen", price: 32000000, location: "GBA Norte — San Isidro", zone: "GBA Norte", attrs: { Marca: "Volkswagen", Modelo: "Golf GTI", Año: 2021, Km: 35000, Combustible: "Nafta", Caja: "Automática" }, badge: "hot", rating: 4.9, reviewCount: 8, views: 2876 },
      { title: "Ford EcoSport SE 2020", categorySlug: "ford", price: 18900000, location: "CABA — Caballito", zone: "CABA", attrs: { Marca: "Ford", Modelo: "EcoSport SE", Año: 2020, Km: 52000, Combustible: "Nafta", Caja: "Manual" }, rating: 4.7, reviewCount: 5, views: 1543 },
      { title: "Renault Sandero Stepway 2023", categorySlug: "renault", price: 22000000, location: "GBA Sur — Quilmes", zone: "GBA Sur", attrs: { Marca: "Renault", Modelo: "Sandero Stepway", Año: 2023, Km: 12000, Combustible: "Nafta", Caja: "Manual" }, badge: "new", rating: 5.0, reviewCount: 3, views: 987 },
      { title: "Peugeot 208 Allure 2022", categorySlug: "peugeot", price: 24000000, location: "CABA — Belgrano", zone: "CABA", attrs: { Marca: "Peugeot", Modelo: "208 Allure", Año: 2022, Km: 24000, Combustible: "Nafta", Caja: "Automática" }, rating: 4.8, reviewCount: 9, views: 1234 },
      { title: "Honda CR-V EXL 2021", categorySlug: "honda", price: 38500000, location: "GBA Norte — San Isidro", zone: "GBA Norte", attrs: { Marca: "Honda", Modelo: "CR-V EXL", Año: 2021, Km: 41000, Combustible: "Nafta", Caja: "Automática CVT" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 7, views: 1876 },
      { title: "Chevrolet Onix LTZ 2022", categorySlug: "chevrolet", price: 21500000, location: "CABA — Palermo", zone: "CABA", attrs: { Marca: "Chevrolet", Modelo: "Onix LTZ", Año: 2022, Km: 31000, Combustible: "Nafta", Caja: "Automática" }, rating: 4.8, reviewCount: 11, views: 1456 },
      { title: "Jeep Renegade Longitude 2023", categorySlug: "jeep", price: 41000000, location: "GBA Oeste — Morón", zone: "GBA Oeste", attrs: { Marca: "Jeep", Modelo: "Renegade Longitude", Año: 2023, Km: 8000, Combustible: "Diésel", Caja: "Automática" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 4, views: 2345 },
      { title: "Toyota Hilux SRV 4x4 2022", categorySlug: "toyota", price: 52000000, location: "Córdoba Capital", zone: "Córdoba", attrs: { Marca: "Toyota", Modelo: "Hilux SRV 4x4", Año: 2022, Km: 35000, Combustible: "Diésel", Caja: "Automática" }, badge: "hot", rating: 4.9, reviewCount: 6, views: 1987 },
      { title: "Honda Civic EX 2020", categorySlug: "honda", price: 26500000, location: "Rosario", zone: "Santa Fe", attrs: { Marca: "Honda", Modelo: "Civic EX", Año: 2020, Km: 48000, Combustible: "Nafta", Caja: "CVT" }, rating: 4.7, reviewCount: 8, views: 1123 },
    ];
    for (const a of autos) {
      const seller = allSellers[Math.floor(Math.random() * allSellers.length)];
      const cat = await db.category.findUnique({ where: { slug: a.categorySlug } });
      const imgs = SAMPLE_IMAGES.auto;
      await db.listing.create({
        data: {
          slug: `${slugify(a.title)}-${Math.random().toString(36).substring(2, 7)}`,
          title: a.title,
          description: `${a.title}. Excelente estado, único dueño. Todos los servicios oficiales. Papeles al día, sin deudas.`,
          categoryType: "auto",
          categoryId: cat?.id,
          price: a.price,
          currency: "ARS",
          priceUnit: "unico",
          location: a.location,
          zone: a.zone,
          province: a.zone,
          images: JSON.stringify([imgs[0], imgs[1], imgs[2] || imgs[0], imgs[3] || imgs[1]]),
          thumbs: JSON.stringify([imgs[0], imgs[1], imgs[2] || imgs[0], imgs[3] || imgs[1]]),
          attrs: JSON.stringify(a.attrs),
          rating: a.rating,
          reviewCount: a.reviewCount,
          views: a.views,
          badge: a.badge || null,
          featured: a.featured || false,
          featuredUntil: a.featured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          boostLevel: a.featured ? 2 : 0,
          status: "active",
          sellerId: seller.id,
        },
      });
    }
    console.log(`✓ ${autos.length} autos creados`);

    const propiedades = [
      { title: "Departamento 2 ambientes en Palermo", categorySlug: "departamento", price: 95000, priceUnit: "mes", location: "CABA — Palermo", zone: "CABA", attrs: { Tipo: "Departamento", Operación: "Alquiler", Superficie: "55 m²", Ambientes: 2, Baños: 1, Piso: "3°" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 18, views: 4521 },
      { title: "Casa 4 ambientes con jardín en San Isidro", categorySlug: "casa", price: 285000000, priceUnit: "unico", location: "GBA Norte — San Isidro", zone: "GBA Norte", attrs: { Tipo: "Casa", Operación: "Venta", Superficie: "220 m²", Ambientes: 4, Baños: 3, Jardín: "Sí", Cochera: "2 autos" }, badge: "featured", featured: true, rating: 4.9, reviewCount: 12, views: 3876 },
      { title: "PH 3 ambientes con patio en Caballito", categorySlug: "ph", price: 145000000, priceUnit: "unico", location: "CABA — Caballito", zone: "CABA", attrs: { Tipo: "PH", Operación: "Venta", Superficie: "110 m²", Ambientes: 3, Baños: 2, Patio: "Sí" }, rating: 4.8, reviewCount: 7, views: 2345 },
      { title: "Local comercial en zona céntrica", categorySlug: "local-comercial", price: 350000, priceUnit: "mes", location: "CABA — Microcentro", zone: "CABA", attrs: { Tipo: "Local comercial", Operación: "Alquiler", Superficie: "80 m²", Frente: "8 m", Depósito: "Sí" }, badge: "hot", rating: 4.7, reviewCount: 5, views: 1876 },
      { title: "Terreno 500m² para construir", categorySlug: "terreno", price: 89000000, priceUnit: "unico", location: "GBA Sur — Ezeiza", zone: "GBA Sur", attrs: { Tipo: "Terreno", Operación: "Venta", Superficie: "500 m²", Servicios: "Todos" }, rating: 4.6, reviewCount: 4, views: 1234 },
      { title: "Oficina moderna en Puerto Madero", categorySlug: "oficina", price: 1200000, priceUnit: "mes", location: "CABA — Puerto Madero", zone: "CABA", attrs: { Tipo: "Oficina", Operación: "Alquiler", Superficie: "150 m²", Piso: "12°", Cochera: "3 espacios" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 9, views: 2987 },
      { title: "Quinta con pileta en Tigre", categorySlug: "quinta", price: 195000000, priceUnit: "unico", location: "GBA Norte — Tigre", zone: "GBA Norte", attrs: { Tipo: "Quinta", Operación: "Venta", Superficie: "450 m²", Pileta: "Sí", Asador: "Sí" }, badge: "hot", rating: 4.9, reviewCount: 8, views: 2156 },
      { title: "Studio amoblado en San Telmo", categorySlug: "studio", price: 65000, priceUnit: "mes", location: "CABA — San Telmo", zone: "CABA", attrs: { Tipo: "Studio", Operación: "Alquiler temporal", Superficie: "32 m²", Amoblado: "Sí", WiFi: "Sí", Vista: "A la calle" }, badge: "new", rating: 4.8, reviewCount: 11, views: 1678 },
      { title: "Departamento 3 ambientes en Belgrano", categorySlug: "departamento", price: 165000000, priceUnit: "unico", location: "CABA — Belgrano", zone: "CABA", attrs: { Tipo: "Departamento", Operación: "Venta", Superficie: "78 m²", Ambientes: 3, Baños: 2, Piso: "5°", Expensas: 85000 }, rating: 4.8, reviewCount: 14, views: 2890 },
      { title: "Casa de campo en Córdoba", categorySlug: "casa", price: 225000000, priceUnit: "unico", location: "Córdoba Capital", zone: "Córdoba", attrs: { Tipo: "Casa", Operación: "Venta", Superficie: "320 m²", Ambientes: 5, Baños: 4, Jardín: "Sí 2000m²", Cochera: "Sí" }, badge: "featured", featured: true, rating: 5.0, reviewCount: 6, views: 1987 },
    ];
    for (const p of propiedades) {
      const seller = allSellers[Math.floor(Math.random() * allSellers.length)];
      const cat = await db.category.findUnique({ where: { slug: p.categorySlug } });
      const imgs = SAMPLE_IMAGES.propiedad;
      await db.listing.create({
        data: {
          slug: `${slugify(p.title)}-${Math.random().toString(36).substring(2, 7)}`,
          title: p.title,
          description: `${p.title}. Excelente ubicación, todos los servicios. Listo para habitar.`,
          categoryType: "propiedad",
          categoryId: cat?.id,
          price: p.price,
          currency: "ARS",
          priceUnit: p.priceUnit,
          location: p.location,
          zone: p.zone,
          province: p.zone,
          images: JSON.stringify([imgs[0], imgs[1], imgs[2] || imgs[0], imgs[3] || imgs[1]]),
          thumbs: JSON.stringify([imgs[0], imgs[1], imgs[2] || imgs[0], imgs[3] || imgs[1]]),
          attrs: JSON.stringify(p.attrs),
          rating: p.rating,
          reviewCount: p.reviewCount,
          views: p.views,
          badge: p.badge || null,
          featured: p.featured || false,
          featuredUntil: p.featured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          boostLevel: p.featured ? 2 : 0,
          status: "active",
          sellerId: seller.id,
        },
      });
    }
    console.log(`✓ ${propiedades.length} propiedades creadas`);

    // ─── Reseñas ───
    const reviewTexts = [
      "Excelente servicio, muy profesional y puntual. Lo recomiendo totalmente.",
      "Muy conforme con el trabajo realizado. Cumplió con todo lo prometido.",
      "Gran experiencia, superó mis expectativas. Volveré a contratarlo.",
      "Muy buen trato y calidad. Precios accesibles.",
      "100% recomendable. Serio, responsable y de confianza.",
    ];
    const allListings = await db.listing.findMany({ select: { id: true, reviewCount: true, sellerId: true } });
    for (const listing of allListings) {
      const numReviews = Math.min(listing.reviewCount, 4);
      for (let i = 0; i < numReviews; i++) {
        const reviewer = allSellers[Math.floor(Math.random() * allSellers.length)];
        if (reviewer.id === listing.sellerId) continue;
        try {
          await db.review.create({
            data: {
              listingId: listing.id,
              userId: reviewer.id,
              rating: 5,
              comment: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
              createdAt: new Date(Date.now() - Math.floor(Math.random() * 28) * 24 * 60 * 60 * 1000),
            },
          });
        } catch {
          // skip duplicates
        }
      }
    }
    console.log("✓ Reseñas creadas");
  }

  // ─── Conversaciones demo ───
  const existingConvos = await db.conversation.count();
  if (existingConvos === 0) {
    const convos = [
      { listingTitle: "Toyota Corolla", sellerEmail: "juan.garcia@email.com", buyerEmail: "maria.gonzalez@email.com", lastMsg: "¿Aún está disponible?" },
      { listingTitle: "Departamento", sellerEmail: "carlos.mendez@email.com", buyerEmail: "juan.garcia@email.com", lastMsg: "Perfecto, lo veo mañana" },
      { listingTitle: "Diseño de marca", sellerEmail: "sofia.romero@email.com", buyerEmail: "juan.garcia@email.com", lastMsg: "Te envío el brief por mail" },
    ];
    for (const c of convos) {
      const seller = await db.user.findUnique({ where: { email: c.sellerEmail } });
      const buyer = await db.user.findUnique({ where: { email: c.buyerEmail } });
      if (!seller || !buyer) continue;
      const listing = await db.listing.findFirst({ where: { title: { startsWith: c.listingTitle } } });
      const conv = await db.conversation.create({
        data: {
          listingId: listing?.id,
          participants: { connect: [{ id: seller.id }, { id: buyer.id }] },
        },
      });
      const messages = [
        { senderId: buyer.id, content: c.lastMsg, hoursAgo: 2 },
        { senderId: seller.id, content: "Gracias por tu mensaje, te respondo a la brevedad.", hoursAgo: 1 },
      ];
      for (const m of messages) {
        await db.message.create({
          data: {
            conversationId: conv.id,
            senderId: m.senderId,
            content: m.content,
            createdAt: new Date(Date.now() - m.hoursAgo * 60 * 60 * 1000),
          },
        });
      }
    }
    console.log("✓ Conversaciones demo creadas");
  }

  // ─── Transacciones demo ───
  const existingTx = await db.transaction.count();
  if (existingTx === 0) {
    const txConcepts = [
      { concept: "Suscripción Pro - Mensual", amount: 7990, status: "approved", method: "mercadopago" },
      { concept: "Suscripción Business - Mensual", amount: 24990, status: "approved", method: "mercadopago" },
      { concept: "Boost Destacado 30 días", amount: 4990, status: "approved", method: "mercadopago" },
      { concept: "Suscripción Pro - Mensual", amount: 7990, status: "approved", method: "tarjeta" },
      { concept: "Boost Top 7 días", amount: 2990, status: "pending", method: "mercadopago" },
      { concept: "Suscripción Business - Mensual", amount: 24990, status: "approved", method: "transferencia" },
      { concept: "Boost Premium Destacado", amount: 9990, status: "approved", method: "mercadopago" },
      { concept: "Suscripción Pro - Mensual", amount: 7990, status: "rejected", method: "tarjeta" },
      { concept: "Suscripción Pro - Mensual", amount: 7990, status: "refunded", method: "mercadopago" },
      { concept: "Boost Destacado 30 días", amount: 4990, status: "approved", method: "mercadopago" },
    ];
    for (let i = 0; i < txConcepts.length; i++) {
      const tx = txConcepts[i];
      const user = allSellers[Math.floor(Math.random() * allSellers.length)];
      await db.transaction.create({
        data: {
          txId: `TXN-${String(Math.floor(100000 + Math.random() * 900000))}`,
          userId: user.id,
          concept: tx.concept,
          method: tx.method,
          amount: tx.amount,
          status: tx.status,
          createdAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000),
        },
      });
    }
    console.log("✓ Transacciones demo creadas");
  }

  // ─── Reportes demo ───
  const existingReports = await db.report.count();
  if (existingReports === 0) {
    const reportReasons = ["spam", "fraude", "contenido inapropiado", "estafa", "otro"];
    const allListings = await db.listing.findMany({ take: 5 });
    for (let i = 0; i < 3; i++) {
      const reporter = allSellers[Math.floor(Math.random() * allSellers.length)];
      const listing = allListings[Math.floor(Math.random() * allListings.length)];
      await db.report.create({
        data: {
          reporterId: reporter.id,
          listingId: listing?.id,
          reason: reportReasons[Math.floor(Math.random() * reportReasons.length)],
          description: "Reporte automático de prueba para validar el sistema de moderación.",
        },
      });
    }
    console.log("✓ Reportes demo creados");
  }

  console.log("\n✅ Seed completado!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("CREDENCIALES DE ACCESO:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Usuario demo:");
  console.log("   Email: juan.garcia@email.com");
  console.log("   Pass:  user123");
  console.log("");
  console.log("🛡️  Admin:");
  console.log("   Email: admin@umpi.com.ar");
  console.log("   Pass:  admin123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
