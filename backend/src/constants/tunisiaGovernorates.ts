export const TUNISIA_GOVERNORATES = [
  { id: "ariana", name: "Ariana" },
  { id: "beja", name: "Béja" },
  { id: "ben-arous", name: "Ben Arous" },
  { id: "bizerte", name: "Bizerte" },
  { id: "gabes", name: "Gabès" },
  { id: "gafsa", name: "Gafsa" },
  { id: "jendouba", name: "Jendouba" },
  { id: "kairouan", name: "Kairouan" },
  { id: "kasserine", name: "Kasserine" },
  { id: "kebili", name: "Kébili" },
  { id: "kef", name: "Le Kef" },
  { id: "mahdia", name: "Mahdia" },
  { id: "manouba", name: "Manouba" },
  { id: "medenine", name: "Médenine" },
  { id: "monastir", name: "Monastir" },
  { id: "nabeul", name: "Nabeul" },
  { id: "sfax", name: "Sfax" },
  { id: "sidi-bouzid", name: "Sidi Bouzid" },
  { id: "siliana", name: "Siliana" },
  { id: "sousse", name: "Sousse" },
  { id: "tataouine", name: "Tataouine" },
  { id: "tozeur", name: "Tozeur" },
  { id: "tunis", name: "Tunis" },
  { id: "zaghouan", name: "Zaghouan" },
] as const;

export type TunisiaGovernorateId =
  (typeof TUNISIA_GOVERNORATES)[number]["id"];

export const isTunisiaGovernorateId = (
  value: unknown,
): value is TunisiaGovernorateId =>
  typeof value === "string" &&
  TUNISIA_GOVERNORATES.some((governorate) => governorate.id === value);
