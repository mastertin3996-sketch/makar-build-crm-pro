import { PrismaClient, RequestStatus, RequestSource, ProductCategory, InteractionType, Role } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile();
} catch {
  // .env відсутній — використаємо значення за замовчуванням
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const hash = (pw: string) => bcrypt.hash(pw, 10);

async function main() {
  // Очистка (у порядку залежностей: спочатку дочірні)
  await prisma.call.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.trackingEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.request.deleteMany();
  await prisma.product.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // --- Користувачі (по ролях) ---
  const owner = await prisma.user.create({
    data: { email: "owner@makar.ua", login: "owner", fullName: "Макар Власник", role: Role.OWNER, requestScope: "ALL", passwordHash: await hash("owner1234") },
  });
  const admin = await prisma.user.create({
    data: { email: "admin@makar.ua", login: "admin", fullName: "Адмін Системний", role: Role.ADMIN, requestScope: "ALL", passwordHash: await hash("admin1234"), managerId: owner.id },
  });
  const head = await prisma.user.create({
    data: { email: "head@makar.ua", login: "head", fullName: "Олена Керівник", role: Role.SALES_HEAD, requestScope: "DEPARTMENT", passwordHash: await hash("head1234"), managerId: owner.id },
  });
  const andrii = await prisma.user.create({
    data: { email: "andrii@makar.ua", login: "andrii", fullName: "Андрій", role: Role.MANAGER, requestScope: "OWN", passwordHash: await hash("manager1234"), managerId: head.id },
  });
  const maria = await prisma.user.create({
    data: { email: "maria@makar.ua", login: "maria", fullName: "Марія", role: Role.MANAGER, requestScope: "OWN", passwordHash: await hash("maria1234"), managerId: head.id },
  });
  // Спільний демо-логін menager@makar.ua
  await prisma.user.create({
    data: { email: "manager@makar.ua", login: "manager", fullName: "Менеджер Демо", role: Role.MANAGER, requestScope: "OWN", passwordHash: await hash("manager1234"), managerId: head.id },
  });
  await prisma.user.create({
    data: { email: "logist@makar.ua", login: "logist", fullName: "Логіст Петро", role: Role.LOGIST, passwordHash: await hash("logist1234") },
  });
  await prisma.user.create({
    data: { email: "sklad@makar.ua", login: "sklad", fullName: "Комірник Іван", role: Role.STOREKEEPER, passwordHash: await hash("sklad1234") },
  });
  await prisma.user.create({
    data: { email: "buh@makar.ua", login: "buh", fullName: "Бухгалтер Ольга", role: Role.ACCOUNTANT, requestScope: "ALL", passwordHash: await hash("buh1234") },
  });
  await prisma.user.create({
    data: { email: "montaj@makar.ua", login: "montaj", fullName: "Монтажник Сергій", role: Role.INSTALLER, passwordHash: await hash("montaj1234") },
  });
  await prisma.user.create({
    data: { email: "viewer@makar.ua", login: "viewer", fullName: "Спостерігач", role: Role.VIEWER, requestScope: "ALL", passwordHash: await hash("viewer1234") },
  });

  // мапа менеджерів за ім'ям → для власника заявок
  const ownerByManager: Record<string, string> = { "Андрій": andrii.id, "Марія": maria.id };

  // --- Товари ---
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Паркан 3D Гартований 1.5м (зелений)",
        sku: "3D-150-GR",
        category: ProductCategory.FENCE_3D,
        costPrice: 420,
        price: 690,
        minPrice: 590,
        stock: 240,
        unit: "секція",
        description: "Зварна 3D-секція, ППЛ покриття, h=1.5м, ширина 2.5м",
      },
    }),
    prisma.product.create({
      data: {
        name: "Стовп оцинкований 60x40 h=2.0м",
        sku: "ST-6040-20",
        category: ProductCategory.POSTS,
        costPrice: 180,
        price: 320,
        minPrice: 280,
        stock: 520,
        unit: "шт",
      },
    }),
    prisma.product.create({
      data: {
        name: "Комплект кріплення для 3D паркана",
        sku: "KR-3D-SET",
        category: ProductCategory.FASTENERS,
        costPrice: 35,
        price: 80,
        minPrice: 60,
        stock: 1500,
        unit: "компл",
      },
    }),
    prisma.product.create({
      data: {
        name: "Ворота розпашні 3.0x2.0м",
        sku: "VR-3020",
        category: ProductCategory.GATES,
        costPrice: 4800,
        price: 7900,
        minPrice: 6900,
        stock: 12,
        unit: "шт",
      },
    }),
    prisma.product.create({
      data: {
        name: "Хвіртка 1.0x2.0м",
        sku: "HV-1020",
        category: ProductCategory.WICKETS,
        costPrice: 1600,
        price: 2900,
        minPrice: 2400,
        stock: 28,
        unit: "шт",
      },
    }),
    prisma.product.create({
      data: {
        name: "Сітка рабиця оцинкована 1.5м (рулон 10м)",
        sku: "SR-150-10",
        category: ProductCategory.CHAIN_MESH,
        costPrice: 520,
        price: 850,
        minPrice: 720,
        stock: 90,
        unit: "рулон",
      },
    }),
    prisma.product.create({
      data: {
        name: "Профнастил ПС-20 матовий (зелений)",
        sku: "PN-20-GR",
        category: ProductCategory.PROFILED_SHEET,
        costPrice: 280,
        price: 420,
        minPrice: 360,
        stock: 340,
        unit: "м.кв",
      },
    }),
    prisma.product.create({
      data: {
        name: "Монтаж паркана (за погонний метр)",
        sku: "SRV-MONT",
        category: ProductCategory.SERVICES,
        costPrice: 150,
        price: 350,
        minPrice: 300,
        stock: 0,
        unit: "пог.м",
      },
    }),
    prisma.product.create({
      data: {
        name: "Доставка по місту",
        sku: "SRV-DELIV",
        category: ProductCategory.SERVICES,
        costPrice: 300,
        price: 600,
        minPrice: 500,
        stock: 0,
        unit: "виїзд",
      },
    }),
  ]);

  // --- Склади + початкові залишки ---
  const mainWh = await prisma.warehouse.create({
    data: { name: "Головний склад", isDefault: true },
  });
  const showroom = await prisma.warehouse.create({
    data: { name: "Виставковий зал" },
  });

  for (const p of products) {
    if (p.category === ProductCategory.SERVICES) continue; // послуги без залишків
    // основний обсяг — на головному складі, невелика частина — у залі
    const showroomQty = Math.min(5, Math.floor(p.stock * 0.05));
    await prisma.stockItem.create({
      data: { productId: p.id, warehouseId: mainWh.id, quantity: p.stock - showroomQty, reserved: 0 },
    });
    if (showroomQty > 0) {
      await prisma.stockItem.create({
        data: { productId: p.id, warehouseId: showroom.id, quantity: showroomQty, reserved: 0 },
      });
    }
  }
  // демо-резерв під заявку
  await prisma.stockItem.updateMany({
    where: { warehouseId: mainWh.id, product: { sku: "VR-3020" } },
    data: { reserved: 1 },
  });

  // --- Клієнти ---
  const oleg = await prisma.client.create({
    data: {
      fullName: "Олег Петренко",
      phone: "+380671234567",
      email: "o.petrenko@gmail.com",
      company: 'ТОВ "БудМайстер"',
      edrpou: "38291047",
      address: "м. Київ, вул. Будівельників 12",
      notes: "Постійний клієнт, працює з відстрочкою платежу",
    },
  });
  const iryna = await prisma.client.create({
    data: {
      fullName: "Ірина Коваль",
      phone: "+380502345678",
      email: "iryna.koval@ukr.net",
      address: "м. Бровари, вул. Незалежності 45",
      notes: "Цікавиться парканом на дачу",
    },
  });
  const vasyl = await prisma.client.create({
    data: {
      fullName: "Василь Шевчук",
      phone: "+380933456789",
      company: "ФОП Шевчук В.М.",
      ipn: "2901234567",
      address: "м. Бориспіль, вул. Київський шлях 100",
    },
  });

  // --- Заявки ---
  const r1 = await prisma.request.create({
    data: {
      number: 1001,
      title: "Паркан 3D на 50 пог.м + монтаж",
      status: RequestStatus.QUOTE_SENT,
      source: RequestSource.WEBSITE,
      amount: 68500,
      manager: "Андрій",
      ownerId: ownerByManager["Андрій"],
      clientId: oleg.id,
      comment: "Потрібен прорахунок з монтажем під ключ",
      items: {
        create: [
          { name: "Паркан 3D Гартований 1.5м (зелений)", quantity: 20, price: 690, productId: products[0].id },
          { name: "Стовп оцинкований 60x40 h=2.0м", quantity: 21, price: 320, productId: products[1].id },
          { name: "Монтаж паркана", quantity: 50, price: 350, productId: products[7].id },
        ],
      },
    },
  });

  const r2 = await prisma.request.create({
    data: {
      number: 1002,
      title: "Ворота + хвіртка",
      status: RequestStatus.AWAITING_PAYMENT,
      source: RequestSource.INSTAGRAM,
      amount: 10800,
      manager: "Марія",
      ownerId: ownerByManager["Марія"],
      clientId: iryna.id,
      items: {
        create: [
          { name: "Ворота розпашні 3.0x2.0м", quantity: 1, price: 7900, productId: products[3].id },
          { name: "Хвіртка 1.0x2.0м", quantity: 1, price: 2900, productId: products[4].id },
        ],
      },
    },
  });

  await prisma.request.create({
    data: {
      number: 1003,
      title: "Сітка рабиця 200м",
      status: RequestStatus.NEW_LEAD,
      source: RequestSource.OLX,
      amount: 17000,
      manager: "Андрій",
      ownerId: ownerByManager["Андрій"],
      clientId: vasyl.id,
    },
  });

  await prisma.request.create({
    data: {
      number: 1004,
      title: "Профнастил на огорожу 120 м.кв",
      status: RequestStatus.PAID,
      source: RequestSource.PROM,
      amount: 50400,
      manager: "Марія",
      ownerId: ownerByManager["Марія"],
      clientId: oleg.id,
    },
  });

  await prisma.request.create({
    data: {
      number: 1005,
      title: "Консультація щодо металоконструкції",
      status: RequestStatus.CALL_BACK,
      source: RequestSource.PHONE,
      amount: 0,
      manager: "Андрій",
      ownerId: ownerByManager["Андрій"],
    },
  });

  await prisma.request.create({
    data: {
      number: 1006,
      title: "Паркан профнастил + ворота",
      status: RequestStatus.PRODUCTION,
      source: RequestSource.TELEGRAM,
      amount: 92300,
      manager: "Марія",
      ownerId: ownerByManager["Марія"],
      clientId: vasyl.id,
    },
  });

  await prisma.request.create({
    data: {
      number: 1007,
      title: "Хвіртка під замовлення",
      status: RequestStatus.COMPLETED,
      source: RequestSource.WEBSITE,
      amount: 3200,
      manager: "Андрій",
      ownerId: ownerByManager["Андрій"],
      clientId: iryna.id,
    },
  });

  // --- Комунікації ---
  await prisma.interaction.createMany({
    data: [
      { type: InteractionType.CALL, content: "Зателефонував, обговорили обсяги. Чекає КП.", clientId: oleg.id, requestId: r1.id },
      { type: InteractionType.EMAIL, content: "Надіслано комерційну пропозицію на 68 500 грн.", clientId: oleg.id, requestId: r1.id },
      { type: InteractionType.NOTE, content: "Клієнт просив зелений колір RAL 6005.", clientId: oleg.id, requestId: r1.id },
      { type: InteractionType.INSTAGRAM, content: "Написала в Direct, цікавиться термінами виготовлення воріт.", clientId: iryna.id, requestId: r2.id },
      { type: InteractionType.TASK, content: "Передзвонити клієнту після 15:00.", clientId: vasyl.id },
    ],
  });

  // --- Замовлення (з авторезервом на головному складі) ---
  // Хелпер: створити замовлення з позиціями та зарезервувати товар
  async function makeOrder(opts: {
    number: number;
    channel: RequestSource;
    status: "NEW" | "RESERVED" | "SHIPPED" | "COMPLETED";
    clientId?: string;
    ownerId?: string;
    lines: { product: (typeof products)[number]; qty: number }[];
  }) {
    const order = await prisma.order.create({
      data: {
        number: opts.number,
        channel: opts.channel,
        status: opts.status,
        clientId: opts.clientId ?? null,
        warehouseId: mainWh.id,
        ownerId: opts.ownerId ?? null,
      },
    });
    let total = 0;
    for (const { product, qty } of opts.lines) {
      total += product.price * qty;
      const shipped = opts.status === "SHIPPED" || opts.status === "COMPLETED";
      const reservedQty = opts.status === "NEW" ? 0 : qty;
      await prisma.orderItem.create({
        data: { orderId: order.id, productId: product.id, name: product.name, quantity: qty, price: product.price, reservedQty: shipped ? 0 : reservedQty },
      });
      // вплив на склад
      if (shipped) {
        await prisma.stockItem.updateMany({ where: { productId: product.id, warehouseId: mainWh.id }, data: { quantity: { decrement: qty } } });
        await prisma.stockMovement.create({ data: { type: "WRITEOFF", productId: product.id, warehouseId: mainWh.id, quantity: qty, note: `Відвантаження по замовленню #${opts.number}` } });
      } else if (reservedQty > 0) {
        await prisma.stockItem.updateMany({ where: { productId: product.id, warehouseId: mainWh.id }, data: { reserved: { increment: qty } } });
        await prisma.stockMovement.create({ data: { type: "RESERVE", productId: product.id, warehouseId: mainWh.id, quantity: qty, note: `Замовлення #${opts.number}` } });
      }
    }
    await prisma.order.update({ where: { id: order.id }, data: { totalAmount: total } });
  }

  await makeOrder({ number: 5001, channel: RequestSource.PROM, status: "RESERVED", clientId: oleg.id, ownerId: maria.id, lines: [{ product: products[0], qty: 10 }, { product: products[1], qty: 11 }] });
  await makeOrder({ number: 5002, channel: RequestSource.ROZETKA, status: "SHIPPED", clientId: iryna.id, ownerId: andrii.id, lines: [{ product: products[6], qty: 30 }] });
  await makeOrder({ number: 5003, channel: RequestSource.INSTAGRAM, status: "NEW", clientId: vasyl.id, ownerId: maria.id, lines: [{ product: products[5], qty: 4 }] });

  // оновлюємо денормалізований Product.stock після відвантажень
  for (const p of products) {
    const agg = await prisma.stockItem.aggregate({ where: { productId: p.id }, _sum: { quantity: true } });
    await prisma.product.update({ where: { id: p.id }, data: { stock: agg._sum.quantity ?? 0 } });
  }

  // --- Логістика (демо-відправлення) ---
  const order5002 = await prisma.order.findFirst({ where: { number: 5002 } });
  // Вручене відправлення з повною історією
  await prisma.shipment.create({
    data: {
      ttn: "20" + "450012345678",
      carrier: "NOVA_POSHTA",
      status: "DELIVERED",
      recipientName: iryna.fullName,
      recipientPhone: iryna.phone,
      cityFrom: "Київ",
      cityTo: "Бровари",
      address: "Відділення №3",
      weight: 24,
      declaredValue: 12600,
      cost: 180,
      payer: "Отримувач",
      orderId: order5002?.id ?? null,
      clientId: iryna.id,
      ownerId: andrii.id,
      events: {
        create: [
          { status: "CREATED", description: "ТТН створено, очікує відправлення", location: "Київ" },
          { status: "ACCEPTED", description: "Відправлення прийнято у м. Київ", location: "Київ" },
          { status: "IN_TRANSIT", description: "Прямує до м. Бровари", location: "Бровари" },
          { status: "ARRIVED", description: "Прибуло у відділення м. Бровари", location: "Бровари" },
          { status: "DELIVERED", description: "Вручено отримувачу", location: "Бровари" },
        ],
      },
    },
  });
  // Відправлення в дорозі
  await prisma.shipment.create({
    data: {
      ttn: "20" + "450098765432",
      carrier: "UKRPOSHTA",
      status: "IN_TRANSIT",
      recipientName: vasyl.fullName,
      recipientPhone: vasyl.phone,
      cityFrom: "Київ",
      cityTo: "Бориспіль",
      address: "вул. Київський шлях 100",
      weight: 8,
      declaredValue: 7200,
      cost: 95,
      payer: "Відправник",
      clientId: vasyl.id,
      ownerId: maria.id,
      events: {
        create: [
          { status: "CREATED", description: "ТТН створено, очікує відправлення", location: "Київ" },
          { status: "ACCEPTED", description: "Відправлення прийнято у м. Київ", location: "Київ" },
          { status: "IN_TRANSIT", description: "Прямує до м. Бориспіль", location: "Бориспіль" },
        ],
      },
    },
  });

  // --- Документообіг (демо) ---
  const order5001 = await prisma.order.findFirst({ where: { number: 5001 }, include: { items: true } });
  const o1items = (order5001?.items ?? []).map((i) => ({ name: i.name, quantity: i.quantity, price: i.price }));
  const o1total = order5001?.totalAmount ?? 0;

  await prisma.document.create({
    data: { number: "КП-1001", type: "QUOTE", status: "SENT", title: "Комерційна пропозиція для ТОВ «БудМайстер»", total: o1total, items: JSON.stringify(o1items), clientId: oleg.id, orderId: order5001?.id ?? null, ownerId: maria.id },
  });
  await prisma.document.create({
    data: { number: "РАХ-1001", type: "INVOICE", status: "PAID", title: "Рахунок на оплату", total: o1total, items: JSON.stringify(o1items), clientId: oleg.id, orderId: order5001?.id ?? null, ownerId: maria.id },
  });
  await prisma.document.create({
    data: { number: "ДОГ-1001", type: "CONTRACT", status: "SIGNED", title: "Договір поставки", total: o1total, clientId: oleg.id, orderId: order5001?.id ?? null, ownerId: owner.id, notes: "Монтаж входить у вартість." },
  });
  await prisma.document.create({
    data: { number: "АКТ-1001", type: "ACT", status: "SIGNED", title: "Акт виконаних робіт", total: 3200, items: JSON.stringify([{ name: "Хвіртка 1.0x2.0м", quantity: 1, price: 2900 }, { name: "Монтаж", quantity: 1, price: 300 }]), clientId: iryna.id, ownerId: andrii.id },
  });
  await prisma.document.create({
    data: { number: "ГЛ-1001", type: "WARRANTY", status: "SIGNED", title: "Гарантійний лист на огорожу", total: 0, clientId: vasyl.id, ownerId: andrii.id },
  });

  // --- Фінанси (демо-оплати) ---
  const order5003 = await prisma.order.findFirst({ where: { number: 5003 } });
  const invoice = await prisma.document.findFirst({ where: { number: "РАХ-1001" } });

  // Олег: часткова оплата за рахунком (лишиться заборгованість)
  await prisma.payment.create({
    data: { number: 7001, amount: 5000, direction: "INCOME", method: "BANK_TRANSFER", status: "PAID", paidAt: new Date(), clientId: oleg.id, orderId: order5001?.id ?? null, documentId: invoice?.id ?? null, ownerId: maria.id, comment: "Часткова передоплата" },
  });
  // Ірина: повна оплата готівкою
  await prisma.payment.create({
    data: { number: 7002, amount: order5002?.totalAmount ?? 0, direction: "INCOME", method: "CASH", status: "PAID", paidAt: new Date(), clientId: iryna.id, orderId: order5002?.id ?? null, ownerId: andrii.id, comment: "Оплата при отриманні" },
  });
  // Василь: онлайн-оплата в очікуванні (Monobank)
  await prisma.payment.create({
    data: { number: 7003, amount: order5003?.totalAmount ?? 3400, direction: "INCOME", method: "ONLINE", provider: "MONOBANK", status: "PENDING", payUrl: "https://pay.monobank.ua/inv/a1b2c3d4e5f6", clientId: vasyl.id, orderId: order5003?.id ?? null, ownerId: maria.id },
  });
  // Видаток: закупівля матеріалу
  await prisma.payment.create({
    data: { number: 7004, amount: 18000, direction: "EXPENSE", method: "BANK_TRANSFER", status: "PAID", paidAt: new Date(), ownerId: owner.id, comment: "Закупівля профнастилу у постачальника" },
  });

  // --- Месенджери (демо-діалоги) ---
  await prisma.conversation.create({
    data: {
      channel: "TELEGRAM", clientId: oleg.id, title: oleg.fullName, externalId: "@o_petrenko", unread: 0,
      messages: {
        create: [
          { direction: "IN", content: "Доброго дня! Цікавить паркан 3D на 50 метрів 🙂" },
          { direction: "OUT", content: "Вітаю! Підготував КП на 68 500 грн, надсилаю.", authorId: maria.id },
          { direction: "IN", content: "Дякую, розгляну і повернусь." },
        ],
      },
    },
  });
  await prisma.conversation.create({
    data: {
      channel: "INSTAGRAM", clientId: iryna.id, title: iryna.fullName, externalId: "@iryna.koval", unread: 2,
      lastMessageAt: new Date(),
      messages: {
        create: [
          { direction: "OUT", content: "Доброго дня! Дякуємо за звернення в Direct 🌿", authorId: andrii.id },
          { direction: "IN", content: "Які терміни виготовлення воріт?" },
          { direction: "IN", content: "І чи є доставка у Бровари? 🚚" },
        ],
      },
    },
  });
  await prisma.conversation.create({
    data: {
      channel: "VIBER", clientId: vasyl.id, title: vasyl.fullName, externalId: "+380933456789", unread: 1,
      lastMessageAt: new Date(),
      messages: {
        create: [
          { direction: "IN", content: "Підтверджую замовлення профнастилу 👍" },
        ],
      },
    },
  });
  await prisma.conversation.create({
    data: {
      channel: "EMAIL", title: "ТОВ «Спецбуд»", externalId: "info@specbud.ua", unread: 0,
      messages: {
        create: [
          { direction: "IN", content: "Прошу надіслати рахунок на металоконструкції." },
          { direction: "OUT", content: "Рахунок РАХ-1002 у вкладенні.", attachment: "РАХ-1002.pdf", authorId: maria.id },
        ],
      },
    },
  });

  console.log("✅ Seed виконано:", {
    products: products.length,
    clients: 3,
    requests: 7,
    orders: 3,
    shipments: 2,
    documents: 5,
    payments: 4,
    conversations: 4,
  });

  // --- Телефонія (демо-дзвінки) ---
  await prisma.call.create({
    data: { provider: "BINOTEL", direction: "INBOUND", status: "ANSWERED", fromNumber: oleg.phone, toNumber: "+380443030303", duration: 184, recordingUrl: "https://rec.binotel.ua/a1b2c3", clientId: oleg.id, managerId: maria.id, comment: "Обговорили КП" },
  });
  await prisma.call.create({
    data: { provider: "RINGOSTAT", direction: "OUTBOUND", status: "ANSWERED", fromNumber: "+380443030303", toNumber: iryna.phone, duration: 95, recordingUrl: "https://rec.ringostat.ua/d4e5f6", clientId: iryna.id, managerId: andrii.id },
  });
  await prisma.call.create({
    data: { provider: "UNITALK", direction: "INBOUND", status: "MISSED", fromNumber: "+380501112233", toNumber: "+380443030303", duration: 0, managerId: andrii.id },
  });
  // Авто-лід із вхідного дзвінка з невідомого номера
  const leadNum = 1101;
  const autoLead = await prisma.request.create({
    data: { number: leadNum, title: "Вхідний дзвінок +380673334455", status: "NEW_LEAD", source: "PHONE", manager: maria.fullName, ownerId: maria.id, comment: "Автоматичний лід із дзвінка (Binotel). Телефон: +380673334455" },
  });
  await prisma.call.create({
    data: { provider: "BINOTEL", direction: "INBOUND", status: "ANSWERED", fromNumber: "+380673334455", toNumber: "+380443030303", duration: 142, recordingUrl: "https://rec.binotel.ua/g7h8i9", managerId: maria.id, requestId: autoLead.id },
  });

  console.log("📞 Телефонія: 4 дзвінки, 1 авто-лід");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
