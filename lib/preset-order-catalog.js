const PARTS = {
  cpu: {
    "i3-12100": { name: "Intel Core i3-12100", price: 1900000, performance: 35, socket: "LGA1700", watts: 60 },
    "i5-12400": { name: "Intel Core i5-12400", price: 2700000, performance: 52, socket: "LGA1700", watts: 65 },
    "i5-13600k": { name: "Intel Core i5-13600K", price: 4600000, performance: 78, socket: "LGA1700", watts: 125 },
    "r5-7600": { name: "AMD Ryzen 5 7600", price: 3900000, performance: 65, socket: "AM5", watts: 65 },
    "r7-7800x3d": { name: "AMD Ryzen 7 7800X3D", price: 7200000, performance: 84, socket: "AM5", watts: 120 },
    "r9-7950x": { name: "AMD Ryzen 9 7950X", price: 8200000, performance: 100, socket: "AM5", watts: 170 },
  },
  mobo: {
    h610m: { name: "ASUS Prime H610M-K D4", price: 1150000, socket: "LGA1700", ddr: 4, watts: 30 },
    b660m: { name: "MSI PRO B660M-A D4", price: 1850000, socket: "LGA1700", ddr: 4, watts: 35 },
    z790: { name: "Gigabyte Z790 Aorus Elite", price: 3600000, socket: "LGA1700", ddr: 5, watts: 45 },
    a620m: { name: "ASRock A620M-HDV", price: 1500000, socket: "AM5", ddr: 5, watts: 30 },
    b650m: { name: "MSI MAG B650M Mortar", price: 2300000, socket: "AM5", ddr: 5, watts: 40 },
    x670e: { name: "ASUS TUF X670E-Plus", price: 4600000, socket: "AM5", ddr: 5, watts: 50 },
  },
  ram: {
    "d4-8": { name: "8 GB DDR4-3200", price: 400000, ddr: 4, watts: 4 },
    "d4-16": { name: "16 GB DDR4-3200", price: 750000, ddr: 4, watts: 6 },
    "d5-16": { name: "16 GB DDR5-5600", price: 950000, ddr: 5, watts: 6 },
    "d5-32": { name: "32 GB DDR5-6000", price: 1900000, ddr: 5, watts: 8 },
    "d5-64": { name: "64 GB DDR5-6000", price: 3800000, ddr: 5, watts: 10 },
  },
  storage: {
    "sata-256": { name: "256 GB SATA SSD", price: 450000, watts: 3 },
    "nvme-512": { name: "512 GB NVMe SSD", price: 750000, watts: 5 },
    "nvme-1t": { name: "1 TB NVMe SSD", price: 1250000, watts: 6 },
    "nvme-2t": { name: "2 TB NVMe SSD", price: 2400000, watts: 8 },
    "hdd-1t": { name: "1 TB HDD 7200 rpm", price: 650000, watts: 7 },
  },
  gpu: {
    igpu: { name: "Integrated graphics", price: 0, performance: 10, watts: 0 },
    "rtx-3050": { name: "NVIDIA RTX 3050 6GB", price: 2500000, performance: 30, watts: 70 },
    "rtx-4060": { name: "NVIDIA RTX 4060 8GB", price: 4800000, performance: 52, watts: 115 },
    "rtx-4070s": { name: "NVIDIA RTX 4070 Super", price: 10900000, performance: 78, watts: 220 },
    "rtx-4090": { name: "NVIDIA RTX 4090", price: 32500000, performance: 100, watts: 450 },
  },
  psu: {
    "psu-350": { name: "350 W 80+ White", price: 400000, capacity: 350 },
    "psu-450": { name: "450 W 80+ Bronze", price: 650000, capacity: 450 },
    "psu-550": { name: "550 W 80+ Bronze", price: 850000, capacity: 550 },
    "psu-750": { name: "750 W 80+ Gold", price: 1500000, capacity: 750 },
    "psu-1000": { name: "1000 W 80+ Gold", price: 2600000, capacity: 1000 },
  },
  chassis: {
    "mt-lab": { name: 'Micro-ATX Case + 19.5" Monitor', price: 1300000, watts: 20 },
    "sff-case": { name: "Compact SFF Case", price: 700000, watts: 0 },
    "sff-dual": { name: 'Compact SFF + Dual 24" IPS Monitors', price: 3400000, watts: 40 },
    "atx-case": { name: "ATX Airflow Mid-Tower", price: 1050000, watts: 0 },
    "atx-qhd": { name: 'ATX Mid-Tower + 27" QHD 165 Hz', price: 4500000, watts: 35 },
    "atx-4k": { name: 'ATX Mid-Tower + 32" 4K Creator Monitor', price: 7900000, watts: 45 },
  },
};

const REQUIRED_PARTS = ["cpu", "mobo", "ram", "storage", "gpu", "psu", "chassis"];

export function calculateBuildBalanceScore(cpuId, gpuId) {
  const cpu = PARTS.cpu[cpuId];
  const gpu = PARTS.gpu[gpuId];
  if (!cpu || !gpu) throw new Error("Select a supported CPU and GPU.");
  return Math.round(100 - (Math.abs(cpu.performance - gpu.performance) / Math.max(cpu.performance, gpu.performance)) * 100);
}

export function calculateOrderPricing(components, quantity) {
  if (!components || typeof components !== "object" || Array.isArray(components)) {
    throw new Error("Select valid build components.");
  }
  const partDetails = REQUIRED_PARTS.map((key) => {
    const item = PARTS[key][components[key]];
    if (!item) throw new Error(`Select a supported ${key} component.`);
    return { key, id: components[key], name: item.name, price: item.price };
  });
  const cpu = PARTS.cpu[components.cpu];
  const motherboard = PARTS.mobo[components.mobo];
  const ram = PARTS.ram[components.ram];
  if (cpu.socket !== motherboard.socket) {
    throw new Error("The selected CPU and motherboard are incompatible.");
  }
  if (ram.ddr !== motherboard.ddr) {
    throw new Error("The selected RAM and motherboard are incompatible.");
  }
  const watts = partDetails.reduce((total, item) => total + PARTS[item.key][item.id].watts, 0);
  if (watts > PARTS.psu[components.psu].capacity) throw new Error("The selected power supply does not support this build.");

  const unitPrice = partDetails.reduce((total, item) => total + item.price, 0);
  const discountPercent = quantity >= 100 ? 8 : quantity >= 30 ? 5 : quantity >= 10 ? 3 : 0;
  const gross = unitPrice * quantity;
  const discount = Math.round(gross * discountPercent / 100);
  const basePrice = gross - discount;
  const jitBuffer = Math.round(basePrice * 0.05);
  return {
    components: partDetails,
    unitPrice,
    quantity,
    discountPercent,
    discount,
    basePrice,
    jitBuffer,
    totalPrice: basePrice + jitBuffer,
    bottleneckScore: calculateBuildBalanceScore(components.cpu, components.gpu),
  };
}
