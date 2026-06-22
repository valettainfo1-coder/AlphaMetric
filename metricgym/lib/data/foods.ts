/** 40-item quicklist for lean macro logging. Values per typical portion. */
export interface FoodItem {
  id: string;
  nameDe: string;
  portion: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

function food(
  id: string,
  nameDe: string,
  portion: string,
  kcal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
): FoodItem {
  return { id, nameDe, portion, kcal, proteinG, carbsG, fatG };
}

export const FOODS: FoodItem[] = [
  food("chicken-breast", "Hähnchenbrust", "200 g", 330, 62, 0, 8),
  food("beef-lean", "Rinderhack (5%)", "200 g", 274, 42, 0, 10),
  food("salmon", "Lachsfilet", "150 g", 312, 30, 0, 20),
  food("tuna-can", "Thunfisch (Dose)", "140 g", 150, 33, 0, 1),
  food("eggs-3", "Eier", "3 Stück", 234, 19, 1, 16),
  food("egg-whites", "Eiklar", "250 g", 130, 27, 2, 0),
  food("skyr", "Skyr", "250 g", 158, 27, 10, 0),
  food("quark-lean", "Magerquark", "250 g", 168, 30, 10, 1),
  food("greek-yogurt", "Griechischer Joghurt", "200 g", 230, 18, 8, 14),
  food("whey-scoop", "Whey Protein", "30 g", 117, 24, 2, 1),
  food("tofu", "Tofu", "200 g", 248, 28, 4, 14),
  food("tempeh", "Tempeh", "150 g", 288, 30, 12, 14),
  food("lentils", "Linsen (gekocht)", "200 g", 232, 18, 36, 1),
  food("chickpeas", "Kichererbsen (gekocht)", "200 g", 328, 18, 50, 6),
  food("rice-cooked", "Reis (gekocht)", "200 g", 260, 5, 56, 1),
  food("pasta-cooked", "Nudeln (gekocht)", "200 g", 316, 11, 62, 2),
  food("potatoes", "Kartoffeln (gekocht)", "300 g", 261, 6, 60, 0),
  food("sweet-potato", "Süßkartoffel", "250 g", 215, 4, 50, 0),
  food("oats", "Haferflocken", "60 g", 222, 8, 36, 4),
  food("bread-whole", "Vollkornbrot", "2 Scheiben (100 g)", 244, 9, 41, 3),
  food("banana", "Banane", "1 Stück (120 g)", 107, 1, 27, 0),
  food("apple", "Apfel", "1 Stück (180 g)", 94, 0, 25, 0),
  food("berries", "Beeren (gemischt)", "150 g", 64, 1, 14, 0),
  food("orange", "Orange", "1 Stück (150 g)", 71, 1, 18, 0),
  food("avocado", "Avocado", "1/2 Stück (100 g)", 160, 2, 9, 15),
  food("almonds", "Mandeln", "30 g", 174, 6, 6, 15),
  food("peanut-butter", "Erdnussbutter", "30 g", 188, 8, 6, 16),
  food("olive-oil", "Olivenöl", "1 EL (10 g)", 90, 0, 0, 10),
  food("butter", "Butter", "10 g", 74, 0, 0, 8),
  food("cheese-gouda", "Gouda", "30 g", 108, 7, 0, 9),
  food("mozzarella-light", "Mozzarella light", "125 g", 206, 24, 3, 11),
  food("cottage-cheese", "Hüttenkäse", "200 g", 196, 24, 6, 8),
  food("milk-15", "Milch (1,5%)", "250 ml", 118, 9, 12, 4),
  food("broccoli", "Brokkoli", "250 g", 85, 7, 17, 1),
  food("mixed-salad", "Gemischter Salat", "200 g", 40, 3, 7, 0),
  food("bell-pepper", "Paprika", "150 g", 47, 2, 9, 1),
  food("cucumber-tomato", "Gurke & Tomate", "200 g", 36, 2, 7, 0),
  food("protein-bar", "Proteinriegel", "1 Riegel (60 g)", 214, 20, 21, 7),
  food("rice-cakes", "Reiswaffeln", "3 Stück (27 g)", 104, 2, 22, 1),
  food("dark-chocolate", "Zartbitterschokolade (85%)", "20 g", 119, 2, 6, 10),
];

export const FOOD_BY_ID: ReadonlyMap<string, FoodItem> = new Map(FOODS.map((f) => [f.id, f]));
