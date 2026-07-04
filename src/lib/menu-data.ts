import itemZinger from "@/assets/item-zinger.jpg";
import itemBeef from "@/assets/item-beef.jpg";
import itemChicken from "@/assets/item-chicken.jpg";
import itemShawarma from "@/assets/item-shawarma.jpg";
import catFries from "@/assets/cat-fries.jpg";
import catDrinks from "@/assets/cat-drinks.jpg";
import catDeals from "@/assets/cat-deals.jpg";
import heroBurger from "@/assets/hero-burger.jpg";

export type MenuCategory =
  | "burgers"
  | "shawarma"
  | "rolls"
  | "platters"
  | "broast"
  | "sides"
  | "drinks"
  | "extras";

export type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number; // PKR
  shortDescription: string;
  longDescription: string;
  image: string;
  gallery?: string[];
  rating: number;
  reviews: number;
  prepTime: number; // minutes
  calories: number;
  ingredients: string[];
  allergens: string[];
  tags: Array<"bestseller" | "new" | "spicy" | "chicken" | "beef" | "deal" | "popular">;
};

export const CATEGORIES: {
  id: MenuCategory;
  label: string;
  icon: string;
  tagline: string;
}[] = [
  { id: "burgers", label: "Burgers", icon: "🍔", tagline: "Hand-breaded, house-sauced." },
  { id: "shawarma", label: "Shawarma", icon: "🌯", tagline: "Rotisserie-slow. Wrap-fast." },
  { id: "rolls", label: "Rolls", icon: "🥙", tagline: "Paratha-crisp perfection." },
  { id: "platters", label: "Platters", icon: "🍽️", tagline: "Full-family feasts." },
  { id: "broast", label: "Broast", icon: "🍗", tagline: "24-hour brined. Fire-crisped." },
  { id: "sides", label: "Side Orders", icon: "🍟", tagline: "The supporting cast." },
  { id: "drinks", label: "Drinks", icon: "🥤", tagline: "Chilled, fizzy, refreshing." },
  { id: "extras", label: "Extras", icon: "➕", tagline: "Make it yours." },
];

export const MENU: MenuItem[] = [
  // BURGERS
  {
    id: "zinger",
    name: "Zinger Burger",
    category: "burgers",
    price: 490,
    shortDescription: "The original. Hand-breaded fillet, crisp lettuce, house mayo.",
    longDescription:
      "Our signature Zinger — a 24-hour marinated chicken fillet, hand-breaded in our secret 11-spice blend, fried to golden perfection and stacked with crisp iceberg, cool house mayo and pillowy sesame bun.",
    image: itemZinger,
    rating: 4.9,
    reviews: 1240,
    prepTime: 10,
    calories: 560,
    ingredients: ["Chicken fillet", "Sesame bun", "Iceberg lettuce", "House mayo", "11-spice breading"],
    allergens: ["Gluten", "Egg", "Mustard"],
    tags: ["bestseller", "spicy", "chicken", "popular"],
  },
  {
    id: "zinger-cheese",
    name: "Zinger Burger (Cheese)",
    category: "burgers",
    price: 540,
    shortDescription: "Zinger meets molten cheddar. Simple. Perfect.",
    longDescription:
      "The classic Zinger with a slice of aged cheddar that melts over the crunch. Nothing else needed.",
    image: itemChicken,
    rating: 4.8,
    reviews: 890,
    prepTime: 10,
    calories: 640,
    ingredients: ["Chicken fillet", "Cheddar slice", "Sesame bun", "Iceberg", "House mayo"],
    allergens: ["Gluten", "Egg", "Dairy"],
    tags: ["chicken", "spicy", "popular"],
  },
  {
    id: "zinger-oj",
    name: "Zinger Burger (Olives & Jalapeno)",
    category: "burgers",
    price: 560,
    shortDescription: "For the fire-chasers. Olives + jalapeños stacked deep.",
    longDescription:
      "Our Zinger loaded with sliced black olives and fresh green jalapeños for a briny, blazing bite.",
    image: itemZinger,
    rating: 4.7,
    reviews: 512,
    prepTime: 11,
    calories: 620,
    ingredients: ["Chicken fillet", "Olives", "Jalapeños", "Sesame bun", "House mayo"],
    allergens: ["Gluten", "Egg"],
    tags: ["spicy", "chicken"],
  },
  {
    id: "loaded-zinger",
    name: "Loaded Zinger",
    category: "burgers",
    price: 650,
    shortDescription: "Cheese, jalapeños, olives — the works.",
    longDescription:
      "Our Zinger goes full-throttle: melted cheddar, jalapeños, black olives, extra house mayo — every bite loaded.",
    image: itemChicken,
    rating: 4.9,
    reviews: 704,
    prepTime: 12,
    calories: 780,
    ingredients: ["Chicken fillet", "Cheddar", "Jalapeños", "Olives", "House mayo"],
    allergens: ["Gluten", "Egg", "Dairy"],
    tags: ["bestseller", "spicy", "chicken"],
  },
  {
    id: "double-loaded-zinger",
    name: "Double Loaded Zinger",
    category: "burgers",
    price: 890,
    shortDescription: "Two fillets. Double cheese. Zero mercy.",
    longDescription:
      "Two hand-breaded Zinger fillets, two slices of aged cheddar, jalapeños, olives, and double house mayo. The heavyweight champion.",
    image: itemZinger,
    gallery: [itemZinger, itemChicken, heroBurger],
    rating: 5.0,
    reviews: 1502,
    prepTime: 14,
    calories: 1120,
    ingredients: ["2× Chicken fillet", "2× Cheddar", "Jalapeños", "Olives", "House mayo"],
    allergens: ["Gluten", "Egg", "Dairy"],
    tags: ["bestseller", "spicy", "chicken", "popular"],
  },
  {
    id: "patty-burger",
    name: "Patty Burger",
    category: "burgers",
    price: 420,
    shortDescription: "Char-grilled beef patty, sharp onions, smoky sauce.",
    longDescription:
      "100% pure beef patty, char-grilled and stacked with sharp red onion, pickles and our smoked-paprika sauce.",
    image: itemBeef,
    rating: 4.7,
    reviews: 640,
    prepTime: 9,
    calories: 510,
    ingredients: ["Beef patty", "Onion", "Pickle", "Smoky sauce", "Bun"],
    allergens: ["Gluten"],
    tags: ["beef"],
  },
  {
    id: "double-patty-burger",
    name: "Double Patty Burger",
    category: "burgers",
    price: 620,
    shortDescription: "Two beef patties. Twice the smoke.",
    longDescription: "Two char-grilled patties stacked with cheese, onions, pickles and smoked sauce.",
    image: itemBeef,
    rating: 4.8,
    reviews: 480,
    prepTime: 11,
    calories: 820,
    ingredients: ["2× Beef patty", "Cheddar", "Onion", "Pickle", "Smoky sauce"],
    allergens: ["Gluten", "Dairy"],
    tags: ["beef", "bestseller"],
  },
  {
    id: "mega-patty-burger",
    name: "Mega Patty Burger",
    category: "burgers",
    price: 780,
    shortDescription: "A tower of beef, cheese and smoke.",
    longDescription:
      "Three stacked patties, triple cheese, caramelised onions and our house steak sauce. Bring both hands.",
    image: itemBeef,
    rating: 4.9,
    reviews: 320,
    prepTime: 13,
    calories: 1080,
    ingredients: ["3× Beef patty", "3× Cheddar", "Caramelised onion", "Steak sauce"],
    allergens: ["Gluten", "Dairy"],
    tags: ["beef", "new"],
  },
  {
    id: "zinger-with-patty",
    name: "Zinger with Patty",
    category: "burgers",
    price: 720,
    shortDescription: "Chicken + beef. Best of both worlds.",
    longDescription:
      "A Zinger fillet AND a char-grilled beef patty in one bun. Because choosing is overrated.",
    image: itemChicken,
    rating: 4.8,
    reviews: 410,
    prepTime: 12,
    calories: 950,
    ingredients: ["Chicken fillet", "Beef patty", "Cheddar", "House mayo", "Bun"],
    allergens: ["Gluten", "Egg", "Dairy"],
    tags: ["beef", "chicken", "spicy"],
  },
  {
    id: "kebabish-burger",
    name: "Kebabish Burger",
    category: "burgers",
    price: 550,
    shortDescription: "Desi-spiced kebab patty with mint-yogurt slaw.",
    longDescription:
      "Our chef's take: a hand-shaped desi kebab patty with mint-yogurt slaw, red onions and tangy tamarind drizzle.",
    image: itemBeef,
    rating: 4.7,
    reviews: 280,
    prepTime: 11,
    calories: 690,
    ingredients: ["Kebab patty", "Mint yogurt", "Red onion", "Tamarind", "Bun"],
    allergens: ["Gluten", "Dairy"],
    tags: ["new", "beef"],
  },

  // SHAWARMA
  {
    id: "zinger-shawarma",
    name: "Zinger Shawarma",
    category: "shawarma",
    price: 380,
    shortDescription: "Crispy Zinger strips, garlic sauce, warm pita.",
    longDescription:
      "Hand-breaded Zinger strips wrapped in warm pita with garlic mayo, pickles, and shredded lettuce.",
    image: itemShawarma,
    rating: 4.8,
    reviews: 720,
    prepTime: 8,
    calories: 520,
    ingredients: ["Zinger strips", "Pita", "Garlic mayo", "Pickle", "Lettuce"],
    allergens: ["Gluten", "Egg"],
    tags: ["bestseller", "chicken", "spicy"],
  },
  {
    id: "chicken-patty-shawarma",
    name: "Chicken Patty Shawarma",
    category: "shawarma",
    price: 350,
    shortDescription: "Grilled chicken patty, garlic sauce, fresh salad.",
    longDescription:
      "Grilled seasoned chicken patty rolled in soft pita with garlic sauce, tomato, cucumber and pickles.",
    image: itemShawarma,
    rating: 4.6,
    reviews: 410,
    prepTime: 8,
    calories: 480,
    ingredients: ["Chicken patty", "Pita", "Garlic sauce", "Tomato", "Cucumber"],
    allergens: ["Gluten"],
    tags: ["chicken", "popular"],
  },

  // ROLLS
  {
    id: "zinger-paratha-roll",
    name: "Zinger Paratha Roll",
    category: "rolls",
    price: 420,
    shortDescription: "Zinger strips in a flaky paratha with mint chutney.",
    longDescription:
      "Crispy Zinger strips rolled in a golden, flaky paratha with mint chutney, onions and green chillies.",
    image: itemShawarma,
    rating: 4.9,
    reviews: 860,
    prepTime: 9,
    calories: 610,
    ingredients: ["Zinger strips", "Paratha", "Mint chutney", "Onion", "Chilli"],
    allergens: ["Gluten", "Dairy"],
    tags: ["bestseller", "spicy", "chicken", "popular"],
  },
  {
    id: "kebabish-paratha-roll",
    name: "Kebabish Paratha Roll",
    category: "rolls",
    price: 440,
    shortDescription: "Desi kebab, paratha, tamarind. Nostalgia in a wrap.",
    longDescription:
      "Hand-shaped desi kebab wrapped in flaky paratha with tamarind, mint-yogurt and sharp onions.",
    image: itemShawarma,
    rating: 4.8,
    reviews: 520,
    prepTime: 9,
    calories: 640,
    ingredients: ["Kebab", "Paratha", "Tamarind", "Mint yogurt", "Onion"],
    allergens: ["Gluten", "Dairy"],
    tags: ["beef", "popular"],
  },

  // PLATTERS
  {
    id: "zinger-platter",
    name: "Zinger Platter",
    category: "platters",
    price: 1290,
    shortDescription: "2 Zingers, fries, drink, dip. Feast mode on.",
    longDescription:
      "Two Zinger burgers, a large loaded fries, a drink of your choice, and two house dips. Built for two, defended by one.",
    image: heroBurger,
    gallery: [heroBurger, itemZinger, catFries],
    rating: 4.9,
    reviews: 1120,
    prepTime: 15,
    calories: 1850,
    ingredients: ["2× Zinger", "Loaded fries", "Drink", "2× Dip"],
    allergens: ["Gluten", "Egg", "Dairy"],
    tags: ["bestseller", "deal", "popular"],
  },

  // BROAST
  {
    id: "jumbo-chest-piece",
    name: "Jumbo Chest Piece",
    category: "broast",
    price: 490,
    shortDescription: "24-hr brined broast, chef-cut jumbo piece.",
    longDescription:
      "Our signature broast — brined for 24 hours in buttermilk and spice, pressure-fried to golden crunch, served with fries and dip.",
    image: itemChicken,
    rating: 4.9,
    reviews: 980,
    prepTime: 12,
    calories: 720,
    ingredients: ["Chicken chest piece", "Buttermilk brine", "Fries", "Dip"],
    allergens: ["Gluten", "Dairy"],
    tags: ["bestseller", "chicken", "spicy"],
  },

  // SIDES
  {
    id: "nuggets",
    name: "Nuggets",
    category: "sides",
    price: 320,
    shortDescription: "6 crispy chicken nuggets with dip.",
    longDescription:
      "Six all-white-meat chicken nuggets, hand-breaded and fried crisp. Served with your choice of house dip.",
    image: itemChicken,
    rating: 4.6,
    reviews: 380,
    prepTime: 7,
    calories: 320,
    ingredients: ["Chicken nuggets", "Dip"],
    allergens: ["Gluten", "Egg"],
    tags: ["chicken"],
  },
  {
    id: "french-fries",
    name: "French Fries",
    category: "sides",
    price: 220,
    shortDescription: "Golden, salted, crisp on the outside.",
    longDescription: "Skin-on fries, twice-fried for the perfect crunch, tossed with sea salt.",
    image: catFries,
    rating: 4.7,
    reviews: 620,
    prepTime: 5,
    calories: 360,
    ingredients: ["Potato", "Salt", "Sunflower oil"],
    allergens: [],
    tags: ["popular"],
  },
  {
    id: "loaded-fries",
    name: "Loaded Fries",
    category: "sides",
    price: 380,
    shortDescription: "Fries drowned in cheese sauce & jalapeños.",
    longDescription:
      "Our crisp fries loaded with molten cheese sauce, jalapeños, olives and smoky sprinkle.",
    image: catFries,
    rating: 4.8,
    reviews: 810,
    prepTime: 7,
    calories: 620,
    ingredients: ["Fries", "Cheese sauce", "Jalapeños", "Olives"],
    allergens: ["Dairy"],
    tags: ["bestseller", "popular"],
  },
  {
    id: "loaded-fries-chicken",
    name: "Loaded Fries with Chicken",
    category: "sides",
    price: 490,
    shortDescription: "Loaded fries + crispy Zinger strips on top.",
    longDescription:
      "All of our Loaded Fries, then topped with crispy Zinger strips and drizzled with garlic mayo.",
    image: catFries,
    rating: 4.9,
    reviews: 720,
    prepTime: 9,
    calories: 880,
    ingredients: ["Fries", "Cheese sauce", "Zinger strips", "Garlic mayo"],
    allergens: ["Dairy", "Gluten", "Egg"],
    tags: ["bestseller", "chicken", "new"],
  },
  {
    id: "hot-wings",
    name: "Hot Wings",
    category: "sides",
    price: 420,
    shortDescription: "6 fire-glazed wings, ranch on the side.",
    longDescription:
      "Six pieces of Buffalo-style wings tossed in our house hot glaze, served with cool ranch.",
    image: itemChicken,
    rating: 4.8,
    reviews: 560,
    prepTime: 10,
    calories: 540,
    ingredients: ["Chicken wings", "Hot glaze", "Ranch"],
    allergens: ["Dairy"],
    tags: ["spicy", "chicken", "popular"],
  },


  // DRINKS
  ...([
    { id: "pepsi", name: "Pepsi", price: 90 },
    { id: "pepsi-black", name: "Pepsi Black", price: 90 },
    { id: "coca-cola", name: "Coca-Cola", price: 90 },
    { id: "coca-cola-zero", name: "Coca-Cola Zero", price: 90 },
    { id: "7up", name: "7UP", price: 90 },
    { id: "sprite", name: "Sprite", price: 90 },
    { id: "mirinda", name: "Mirinda", price: 90 },
    { id: "mountain-dew", name: "Mountain Dew", price: 100 },
    { id: "sting", name: "Sting Energy", price: 130 },
    { id: "mineral-water", name: "Mineral Water", price: 60 },
  ] as const).map<MenuItem>((d) => ({
    id: d.id,
    name: d.name,
    category: "drinks",
    price: d.price,
    shortDescription: "Chilled 330ml can. Large 500ml available.",
    longDescription: `Ice-cold ${d.name}, served chilled. Available in Regular (330ml) or Large (500ml).`,
    image: catDrinks,
    rating: 4.6,
    reviews: 120,
    prepTime: 1,
    calories: 140,
    ingredients: ["Soft drink"],
    allergens: [],
    tags: ["popular"],
  })),

  // EXTRAS
  {
    id: "cheese-slice",
    name: "Cheese Slice",
    category: "extras",
    price: 80,
    shortDescription: "Aged cheddar. Add to anything.",
    longDescription: "One slice of aged cheddar to add to any burger, roll or shawarma.",
    image: catDeals,
    rating: 4.5,
    reviews: 210,
    prepTime: 1,
    calories: 90,
    ingredients: ["Aged cheddar"],
    allergens: ["Dairy"],
    tags: [],
  },
  {
    id: "olives-jalapeno",
    name: "Olives & Jalapeno",
    category: "extras",
    price: 90,
    shortDescription: "Briny olives + fresh jalapeños.",
    longDescription: "A generous portion of sliced black olives and fresh green jalapeños.",
    image: catDrinks,
    rating: 4.5,
    reviews: 140,
    prepTime: 1,
    calories: 30,
    ingredients: ["Black olives", "Jalapeños"],
    allergens: [],
    tags: ["spicy"],
  },
  {
    id: "sauce",
    name: "Sauce",
    category: "extras",
    price: 60,
    shortDescription: "Pick your dip: mayo, garlic, hot, ranch.",
    longDescription: "One extra house dip — choose from garlic mayo, hot sauce, ranch or smoky BBQ.",
    image: catDeals,
    rating: 4.6,
    reviews: 320,
    prepTime: 1,
    calories: 80,
    ingredients: ["House sauce"],
    allergens: ["Egg", "Dairy"],
    tags: [],
  },
  {
    id: "zinger-fillet",
    name: "Zinger Fillet",
    category: "extras",
    price: 280,
    shortDescription: "One extra crispy Zinger fillet.",
    longDescription:
      "Add another 24-hour marinated, hand-breaded Zinger fillet to anything you're building.",
    image: itemZinger,
    rating: 4.9,
    reviews: 260,
    prepTime: 6,
    calories: 320,
    ingredients: ["Chicken fillet", "11-spice breading"],
    allergens: ["Gluten", "Egg"],
    tags: ["spicy", "chicken"],
  },
];

export const CUSTOMIZATIONS = [
  { id: "extra-cheese", label: "Extra Cheese", price: 80 },
  { id: "extra-patty", label: "Extra Patty", price: 220 },
  { id: "extra-sauce", label: "Extra Sauce", price: 60 },
  { id: "olives", label: "Olives", price: 40 },
  { id: "jalapeno", label: "Jalapeño", price: 40 },
  { id: "remove-onion", label: "Remove Onion", price: 0 },
  { id: "less-spicy", label: "Less Spicy", price: 0 },
  { id: "extra-spicy", label: "Extra Spicy", price: 0 },
] as const;

export const MEAL_UPGRADES = [
  { id: "make-meal", label: "Make it a Meal", desc: "Adds fries + drink", price: 220 },
  { id: "add-fries", label: "Add Fries", desc: "Regular skin-on fries", price: 150 },
  { id: "add-drink", label: "Add Drink", desc: "Choice of soft drink 330ml", price: 120 },
  { id: "upgrade-drink", label: "Upgrade Drink Size", desc: "500ml instead of 330ml", price: 60 },
] as const;

export const FILTERS = [
  { id: "popular", label: "Popular" },
  { id: "bestseller", label: "Best Seller" },
  { id: "new", label: "Newest" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
  { id: "spicy", label: "Spicy" },
  { id: "chicken", label: "Chicken" },
  { id: "beef", label: "Beef" },
  { id: "deal", label: "Deals" },
] as const;

export const POPULAR_SEARCHES = ["Zinger", "Loaded Fries", "Broast", "Paratha Roll", "Platter"];

export function formatPKR(n: number) {
  return `Rs ${n.toLocaleString("en-PK")}`;
}
