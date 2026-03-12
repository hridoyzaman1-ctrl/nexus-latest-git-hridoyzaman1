import type { FoodItem } from '@/types/nutrition';

export const FOOD_DATABASE: FoodItem[] = [
  // ═══════════════════════════════════════
  // RICE & GRAINS
  // ═══════════════════════════════════════
  { id: 'f001', name: 'White Rice (cooked)', aliases: ['bhat', 'chawal', 'steamed rice'], category: 'rice & grains', cuisine: 'global', per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 185, bowl: 300, plate: 400 } },
  { id: 'f002', name: 'Brown Rice (cooked)', aliases: ['lal chal'], category: 'rice & grains', cuisine: 'global', per100g: { calories: 112, protein: 2.6, carbs: 23.5, fat: 0.9, fiber: 1.8 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 195, bowl: 310 } },
  { id: 'f003', name: 'Basmati Rice (cooked)', aliases: ['bashmoti'], category: 'rice & grains', cuisine: 'indian', per100g: { calories: 121, protein: 3.5, carbs: 25.2, fat: 0.4, fiber: 0.4 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 180 } },
  { id: 'f004', name: 'Sticky Rice (cooked)', aliases: ['glutinous rice'], category: 'rice & grains', cuisine: 'thai', per100g: { calories: 97, protein: 2.0, carbs: 21.1, fat: 0.2, fiber: 0.9 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 175 } },
  { id: 'f005', name: 'Fried Rice', aliases: ['bhuna khichuri', 'chao fan'], category: 'rice & grains', cuisine: 'chinese', per100g: { calories: 163, protein: 4.3, carbs: 22, fat: 6.2, fiber: 0.8 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 350 } },
  { id: 'f006', name: 'Biryani Rice', aliases: ['biriyani'], category: 'rice & grains', cuisine: 'bangladeshi', per100g: { calories: 180, protein: 5.5, carbs: 25, fat: 6.5, fiber: 0.6 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 400 } },
  { id: 'f007', name: 'Oats (cooked)', aliases: ['oatmeal', 'porridge'], category: 'rice & grains', cuisine: 'western', per100g: { calories: 68, protein: 2.4, carbs: 12, fat: 1.4, fiber: 1.7 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f008', name: 'Quinoa (cooked)', aliases: [], category: 'rice & grains', cuisine: 'global', per100g: { calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 185 } },
  { id: 'f009', name: 'Khichuri', aliases: ['khichdi'], category: 'rice & grains', cuisine: 'bangladeshi', per100g: { calories: 105, protein: 3.8, carbs: 17, fat: 2.5, fiber: 1.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 300 } },
  { id: 'f010', name: 'Polao', aliases: ['pulao', 'pilaf'], category: 'rice & grains', cuisine: 'bangladeshi', per100g: { calories: 155, protein: 3.2, carbs: 24, fat: 5.0, fiber: 0.5 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 350 } },

  // ═══════════════════════════════════════
  // BREAD & ROTI
  // ═══════════════════════════════════════
  { id: 'f011', name: 'Roti (Chapati)', aliases: ['chapati', 'phulka'], category: 'bread & roti', cuisine: 'bangladeshi', per100g: { calories: 297, protein: 9.8, carbs: 50, fat: 7.5, fiber: 3.5 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 40 } },
  { id: 'f012', name: 'Paratha', aliases: ['porota'], category: 'bread & roti', cuisine: 'bangladeshi', per100g: { calories: 326, protein: 7.8, carbs: 44, fat: 13, fiber: 2.5 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 80 } },
  { id: 'f013', name: 'Naan', aliases: ['nan bread'], category: 'bread & roti', cuisine: 'indian', per100g: { calories: 290, protein: 8.7, carbs: 50, fat: 5.7, fiber: 2.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 90 } },
  { id: 'f014', name: 'Luchi', aliases: ['puri', 'luchi'], category: 'bread & roti', cuisine: 'bangladeshi', per100g: { calories: 370, protein: 6.5, carbs: 46, fat: 18, fiber: 1.5 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 30 } },
  { id: 'f015', name: 'White Bread', aliases: ['sandwich bread', 'pauruti'], category: 'bread & roti', cuisine: 'western', per100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 }, defaultUnit: 'slice', defaultQuantity: 2, unitWeightG: { slice: 28 } },
  { id: 'f016', name: 'Whole Wheat Bread', aliases: ['brown bread', 'atta bread'], category: 'bread & roti', cuisine: 'western', per100g: { calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 6.8 }, defaultUnit: 'slice', defaultQuantity: 2, unitWeightG: { slice: 28 } },
  { id: 'f017', name: 'Tortilla (Flour)', aliases: [], category: 'bread & roti', cuisine: 'mexican', per100g: { calories: 312, protein: 8.3, carbs: 52, fat: 8.0, fiber: 2.2 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 45 } },
  { id: 'f018', name: 'Pita Bread', aliases: [], category: 'bread & roti', cuisine: 'mediterranean', per100g: { calories: 275, protein: 9.1, carbs: 55, fat: 1.2, fiber: 2.2 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 60 } },

  // ═══════════════════════════════════════
  // VEGETABLES
  // ═══════════════════════════════════════
  { id: 'f019', name: 'Potato', aliases: ['alu', 'aloo'], category: 'vegetables', cuisine: 'global', per100g: { calories: 77, protein: 2.0, carbs: 17, fat: 0.1, fiber: 2.2 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 150 } },
  { id: 'f020', name: 'Onion', aliases: ['peyaj'], category: 'vegetables', cuisine: 'global', per100g: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 110 } },
  { id: 'f021', name: 'Tomato', aliases: ['tometo'], category: 'vegetables', cuisine: 'global', per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 123 } },
  { id: 'f022', name: 'Spinach', aliases: ['palak', 'palong shak'], category: 'vegetables', cuisine: 'global', per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 30, bowl: 180 } },
  { id: 'f023', name: 'Cauliflower', aliases: ['fulkopi', 'gobi'], category: 'vegetables', cuisine: 'global', per100g: { calories: 25, protein: 1.9, carbs: 5.0, fat: 0.3, fiber: 2.0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 107 } },
  { id: 'f024', name: 'Broccoli', aliases: [], category: 'vegetables', cuisine: 'global', per100g: { calories: 34, protein: 2.8, carbs: 7.0, fat: 0.4, fiber: 2.6 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 91 } },
  { id: 'f025', name: 'Cabbage', aliases: ['badhakopi'], category: 'vegetables', cuisine: 'global', per100g: { calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 89 } },
  { id: 'f026', name: 'Carrot', aliases: ['gajor'], category: 'vegetables', cuisine: 'global', per100g: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 72 } },
  { id: 'f027', name: 'Cucumber', aliases: ['shosha', 'kheera'], category: 'vegetables', cuisine: 'global', per100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 300 } },
  { id: 'f028', name: 'Eggplant', aliases: ['begun', 'baingan', 'brinjal'], category: 'vegetables', cuisine: 'global', per100g: { calories: 25, protein: 1.0, carbs: 6.0, fat: 0.2, fiber: 3.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 458 } },
  { id: 'f029', name: 'Bitter Gourd', aliases: ['korola', 'karela'], category: 'vegetables', cuisine: 'bangladeshi', per100g: { calories: 17, protein: 1.0, carbs: 3.7, fat: 0.2, fiber: 2.8 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 124 } },
  { id: 'f030', name: 'Bottle Gourd', aliases: ['lau', 'lauki'], category: 'vegetables', cuisine: 'bangladeshi', per100g: { calories: 14, protein: 0.6, carbs: 3.4, fat: 0.02, fiber: 0.5 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 146 } },
  { id: 'f031', name: 'Pumpkin', aliases: ['misti kumra', 'kaddu'], category: 'vegetables', cuisine: 'bangladeshi', per100g: { calories: 26, protein: 1.0, carbs: 6.5, fat: 0.1, fiber: 0.5 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 116 } },
  { id: 'f032', name: 'Okra', aliases: ['dheros', 'bhindi', 'ladyfinger'], category: 'vegetables', cuisine: 'bangladeshi', per100g: { calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 100 } },
  { id: 'f033', name: 'Green Beans', aliases: ['shim', 'barboti'], category: 'vegetables', cuisine: 'global', per100g: { calories: 31, protein: 1.8, carbs: 7.0, fat: 0.1, fiber: 3.4 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 125 } },
  { id: 'f034', name: 'Bell Pepper', aliases: ['capsicum', 'shimla mirch'], category: 'vegetables', cuisine: 'global', per100g: { calories: 31, protein: 1.0, carbs: 6.0, fat: 0.3, fiber: 2.1 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 119 } },
  { id: 'f035', name: 'Sweet Potato', aliases: ['mishti alu'], category: 'vegetables', cuisine: 'global', per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 130 } },
  { id: 'f036', name: 'Mushroom', aliases: ['mashroom'], category: 'vegetables', cuisine: 'global', per100g: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1.0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 70 } },
  { id: 'f037', name: 'Corn', aliases: ['bhutta', 'makka'], category: 'vegetables', cuisine: 'global', per100g: { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2.7 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 90 } },
  { id: 'f038', name: 'Bok Choy', aliases: ['chinese cabbage'], category: 'vegetables', cuisine: 'chinese', per100g: { calories: 13, protein: 1.5, carbs: 2.2, fat: 0.2, fiber: 1.0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 70 } },
  { id: 'f039', name: 'Bean Sprouts', aliases: ['sprouts'], category: 'vegetables', cuisine: 'chinese', per100g: { calories: 31, protein: 3.0, carbs: 6.0, fat: 0.2, fiber: 1.8 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 104 } },
  { id: 'f040', name: 'Bamboo Shoots', aliases: ['bash korola'], category: 'vegetables', cuisine: 'chinese', per100g: { calories: 27, protein: 2.6, carbs: 5.2, fat: 0.3, fiber: 2.2 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 120 } },

  // ═══════════════════════════════════════
  // FRUITS
  // ═══════════════════════════════════════
  { id: 'f041', name: 'Banana', aliases: ['kola', 'kela'], category: 'fruits', cuisine: 'global', per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 118 } },
  { id: 'f042', name: 'Apple', aliases: ['aapel', 'seb'], category: 'fruits', cuisine: 'global', per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 182 } },
  { id: 'f043', name: 'Mango', aliases: ['aam'], category: 'fruits', cuisine: 'bangladeshi', per100g: { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 200 } },
  { id: 'f044', name: 'Orange', aliases: ['komla', 'santra'], category: 'fruits', cuisine: 'global', per100g: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 131 } },
  { id: 'f045', name: 'Papaya', aliases: ['pepe'], category: 'fruits', cuisine: 'bangladeshi', per100g: { calories: 43, protein: 0.5, carbs: 11, fat: 0.3, fiber: 1.7 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 145 } },
  { id: 'f046', name: 'Watermelon', aliases: ['tormuj', 'tarbooj'], category: 'fruits', cuisine: 'global', per100g: { calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 152 } },
  { id: 'f047', name: 'Guava', aliases: ['peyara', 'amrud'], category: 'fruits', cuisine: 'bangladeshi', per100g: { calories: 68, protein: 2.6, carbs: 14, fat: 1.0, fiber: 5.4 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 55 } },
  { id: 'f048', name: 'Jackfruit', aliases: ['kathal', 'kanthal'], category: 'fruits', cuisine: 'bangladeshi', per100g: { calories: 95, protein: 1.7, carbs: 23, fat: 0.6, fiber: 1.5 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 165 } },
  { id: 'f049', name: 'Lychee', aliases: ['litchi', 'lichu'], category: 'fruits', cuisine: 'bangladeshi', per100g: { calories: 66, protein: 0.8, carbs: 17, fat: 0.4, fiber: 1.3 }, defaultUnit: 'piece', defaultQuantity: 5, unitWeightG: { piece: 10 } },
  { id: 'f050', name: 'Coconut (fresh)', aliases: ['narikel', 'nariyal'], category: 'fruits', cuisine: 'bangladeshi', per100g: { calories: 354, protein: 3.3, carbs: 15, fat: 33, fiber: 9.0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 80 } },
  { id: 'f051', name: 'Pineapple', aliases: ['anaros', 'ananas'], category: 'fruits', cuisine: 'global', per100g: { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 165 } },
  { id: 'f052', name: 'Grapes', aliases: ['angur'], category: 'fruits', cuisine: 'global', per100g: { calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 151 } },
  { id: 'f053', name: 'Strawberry', aliases: [], category: 'fruits', cuisine: 'global', per100g: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2.0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 152 } },
  { id: 'f054', name: 'Pomegranate', aliases: ['dalim', 'anar'], category: 'fruits', cuisine: 'global', per100g: { calories: 83, protein: 1.7, carbs: 19, fat: 1.2, fiber: 4.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 282 } },

  // ═══════════════════════════════════════
  // MEAT & POULTRY
  // ═══════════════════════════════════════
  { id: 'f055', name: 'Chicken Breast', aliases: ['murgi breast'], category: 'meat & poultry', cuisine: 'global', per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 174 } },
  { id: 'f056', name: 'Chicken Thigh', aliases: ['murgi ran'], category: 'meat & poultry', cuisine: 'global', per100g: { calories: 209, protein: 26, carbs: 0, fat: 11, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 130 } },
  { id: 'f057', name: 'Chicken Curry', aliases: ['murgi curry', 'murghir jhol'], category: 'meat & poultry', cuisine: 'bangladeshi', per100g: { calories: 155, protein: 15, carbs: 5.5, fat: 8.5, fiber: 0.8 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f058', name: 'Beef (lean)', aliases: ['gorur mangsho'], category: 'meat & poultry', cuisine: 'global', per100g: { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 150 },
  { id: 'f059', name: 'Beef Curry', aliases: ['gorur mangsho curry'], category: 'meat & poultry', cuisine: 'bangladeshi', per100g: { calories: 190, protein: 16, carbs: 6, fat: 12, fiber: 1.0 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f060', name: 'Mutton Curry', aliases: ['khasir mangsho', 'lamb curry'], category: 'meat & poultry', cuisine: 'bangladeshi', per100g: { calories: 215, protein: 17, carbs: 5, fat: 14, fiber: 0.8 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f061', name: 'Ground Beef', aliases: ['keema', 'mince'], category: 'meat & poultry', cuisine: 'global', per100g: { calories: 332, protein: 14, carbs: 0, fat: 30, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 100 },
  { id: 'f062', name: 'Tandoori Chicken', aliases: [], category: 'meat & poultry', cuisine: 'indian', per100g: { calories: 148, protein: 22, carbs: 4, fat: 5, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 150 } },
  { id: 'f063', name: 'Chicken Tikka', aliases: [], category: 'meat & poultry', cuisine: 'indian', per100g: { calories: 162, protein: 24, carbs: 5, fat: 5.5, fiber: 0.4 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 150 } },
  { id: 'f064', name: 'Duck Meat', aliases: ['hansh'], category: 'meat & poultry', cuisine: 'bangladeshi', per100g: { calories: 337, protein: 19, carbs: 0, fat: 28, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 150 },
  { id: 'f065', name: 'Pork (lean)', aliases: [], category: 'meat & poultry', cuisine: 'chinese', per100g: { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 100 },

  // ═══════════════════════════════════════
  // FISH & SEAFOOD
  // ═══════════════════════════════════════
  { id: 'f066', name: 'Hilsa Fish', aliases: ['ilish', 'hilsha'], category: 'fish & seafood', cuisine: 'bangladeshi', per100g: { calories: 273, protein: 22, carbs: 0, fat: 20, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 100 } },
  { id: 'f067', name: 'Rohu Fish', aliases: ['rui mach'], category: 'fish & seafood', cuisine: 'bangladeshi', per100g: { calories: 97, protein: 17, carbs: 0, fat: 3, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 120 } },
  { id: 'f068', name: 'Tilapia', aliases: ['telapia'], category: 'fish & seafood', cuisine: 'bangladeshi', per100g: { calories: 96, protein: 20, carbs: 0, fat: 1.7, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 113 } },
  { id: 'f069', name: 'Catfish', aliases: ['pangash', 'magur'], category: 'fish & seafood', cuisine: 'bangladeshi', per100g: { calories: 105, protein: 18, carbs: 0, fat: 2.8, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 143 } },
  { id: 'f070', name: 'Shrimp', aliases: ['chingri', 'prawn'], category: 'fish & seafood', cuisine: 'bangladeshi', per100g: { calories: 85, protein: 20, carbs: 0.2, fat: 0.5, fiber: 0 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 85 } },
  { id: 'f071', name: 'Salmon', aliases: [], category: 'fish & seafood', cuisine: 'western', per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 170 } },
  { id: 'f072', name: 'Tuna', aliases: [], category: 'fish & seafood', cuisine: 'japanese', per100g: { calories: 130, protein: 29, carbs: 0, fat: 1.0, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 100 },
  { id: 'f073', name: 'Fish Curry', aliases: ['macher jhol'], category: 'fish & seafood', cuisine: 'bangladeshi', per100g: { calories: 95, protein: 12, carbs: 4, fat: 4, fiber: 0.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f074', name: 'Squid', aliases: ['calamari'], category: 'fish & seafood', cuisine: 'global', per100g: { calories: 92, protein: 15.6, carbs: 3.1, fat: 1.4, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 100 },
  { id: 'f075', name: 'Crab', aliases: ['kakra'], category: 'fish & seafood', cuisine: 'global', per100g: { calories: 87, protein: 18, carbs: 0, fat: 1.1, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 100 },

  // ═══════════════════════════════════════
  // EGGS & DAIRY
  // ═══════════════════════════════════════
  { id: 'f076', name: 'Egg (boiled)', aliases: ['dim', 'anda'], category: 'eggs & dairy', cuisine: 'global', per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 50 } },
  { id: 'f077', name: 'Egg (fried)', aliases: ['bhaja dim'], category: 'eggs & dairy', cuisine: 'global', per100g: { calories: 196, protein: 14, carbs: 1.0, fat: 15, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 46 } },
  { id: 'f078', name: 'Milk (whole)', aliases: ['dudh', 'doodh'], category: 'eggs & dairy', cuisine: 'global', per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 244 } },
  { id: 'f079', name: 'Yogurt (plain)', aliases: ['doi', 'dahi', 'curd'], category: 'eggs & dairy', cuisine: 'bangladeshi', per100g: { calories: 59, protein: 3.5, carbs: 3.6, fat: 3.3, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 245 } },
  { id: 'f080', name: 'Paneer', aliases: ['cottage cheese'], category: 'eggs & dairy', cuisine: 'indian', per100g: { calories: 265, protein: 18, carbs: 1.2, fat: 21, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 100 },
  { id: 'f081', name: 'Cheese (Cheddar)', aliases: ['cheese'], category: 'eggs & dairy', cuisine: 'western', per100g: { calories: 403, protein: 25, carbs: 1.3, fat: 33, fiber: 0 }, defaultUnit: 'slice', defaultQuantity: 1, unitWeightG: { slice: 28 } },
  { id: 'f082', name: 'Butter', aliases: ['makhon'], category: 'eggs & dairy', cuisine: 'global', per100g: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },
  { id: 'f083', name: 'Ghee', aliases: ['ghee', 'clarified butter'], category: 'eggs & dairy', cuisine: 'bangladeshi', per100g: { calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },
  { id: 'f084', name: 'Mozzarella', aliases: [], category: 'eggs & dairy', cuisine: 'western', per100g: { calories: 280, protein: 28, carbs: 3.1, fat: 17, fiber: 0 }, defaultUnit: 'g', defaultQuantity: 30 },
  { id: 'f085', name: 'Greek Yogurt', aliases: [], category: 'eggs & dairy', cuisine: 'mediterranean', per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 200 } },

  // ═══════════════════════════════════════
  // LENTILS & LEGUMES
  // ═══════════════════════════════════════
  { id: 'f086', name: 'Red Lentils (Dal)', aliases: ['masoor dal', 'musur dal'], category: 'lentils & legumes', cuisine: 'bangladeshi', per100g: { calories: 116, protein: 9.0, carbs: 20, fat: 0.4, fiber: 4.0 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f087', name: 'Yellow Lentils', aliases: ['moong dal'], category: 'lentils & legumes', cuisine: 'bangladeshi', per100g: { calories: 106, protein: 7.0, carbs: 19, fat: 0.4, fiber: 5.0 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f088', name: 'Chickpeas', aliases: ['chola', 'chole', 'chana'], category: 'lentils & legumes', cuisine: 'bangladeshi', per100g: { calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 164 } },
  { id: 'f089', name: 'Black-eyed Peas', aliases: ['barboti', 'lobia'], category: 'lentils & legumes', cuisine: 'bangladeshi', per100g: { calories: 116, protein: 7.7, carbs: 21, fat: 0.5, fiber: 6.5 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 172 } },
  { id: 'f090', name: 'Kidney Beans', aliases: ['rajma'], category: 'lentils & legumes', cuisine: 'indian', per100g: { calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 6.4 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 177 } },
  { id: 'f091', name: 'Tofu', aliases: ['bean curd', 'soy paneer'], category: 'lentils & legumes', cuisine: 'chinese', per100g: { calories: 76, protein: 8.0, carbs: 1.9, fat: 4.8, fiber: 0.3 }, defaultUnit: 'g', defaultQuantity: 150 },
  { id: 'f092', name: 'Edamame', aliases: ['green soybeans'], category: 'lentils & legumes', cuisine: 'japanese', per100g: { calories: 121, protein: 11, carbs: 9.0, fat: 5.0, fiber: 5.2 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 155 } },
  { id: 'f093', name: 'Pigeon Peas', aliases: ['arhar dal', 'toor dal'], category: 'lentils & legumes', cuisine: 'indian', per100g: { calories: 114, protein: 7.2, carbs: 21, fat: 0.4, fiber: 5.1 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },

  // ═══════════════════════════════════════
  // NOODLES & PASTA
  // ═══════════════════════════════════════
  { id: 'f094', name: 'Spaghetti (cooked)', aliases: ['pasta'], category: 'noodles & pasta', cuisine: 'western', per100g: { calories: 131, protein: 5.0, carbs: 25, fat: 1.1, fiber: 1.8 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 220 } },
  { id: 'f095', name: 'Egg Noodles (cooked)', aliases: ['chow mein noodles'], category: 'noodles & pasta', cuisine: 'chinese', per100g: { calories: 138, protein: 4.4, carbs: 25, fat: 2.1, fiber: 1.2 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 220 } },
  { id: 'f096', name: 'Rice Noodles (cooked)', aliases: ['pho noodles', 'vermicelli'], category: 'noodles & pasta', cuisine: 'thai', per100g: { calories: 109, protein: 0.9, carbs: 24, fat: 0.2, fiber: 1.0 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 200 } },
  { id: 'f097', name: 'Ramen Noodles', aliases: ['instant noodles'], category: 'noodles & pasta', cuisine: 'japanese', per100g: { calories: 138, protein: 4.5, carbs: 26, fat: 2.0, fiber: 1.0 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f098', name: 'Udon Noodles', aliases: [], category: 'noodles & pasta', cuisine: 'japanese', per100g: { calories: 99, protein: 3.0, carbs: 22, fat: 0.1, fiber: 0.9 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f099', name: 'Soba Noodles', aliases: ['buckwheat noodles'], category: 'noodles & pasta', cuisine: 'japanese', per100g: { calories: 99, protein: 5.1, carbs: 21, fat: 0.1, fiber: 0.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f100', name: 'Glass Noodles', aliases: ['cellophane noodles', 'japchae noodles'], category: 'noodles & pasta', cuisine: 'korean', per100g: { calories: 334, protein: 0.1, carbs: 82, fat: 0.1, fiber: 0.5 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 50 } },
  { id: 'f101', name: 'Macaroni (cooked)', aliases: ['mac'], category: 'noodles & pasta', cuisine: 'western', per100g: { calories: 131, protein: 5.1, carbs: 25, fat: 1.2, fiber: 1.8 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 140 } },

  // ═══════════════════════════════════════
  // CURRY & GRAVY
  // ═══════════════════════════════════════
  { id: 'f102', name: 'Aloo Bhaji', aliases: ['potato curry', 'alu bhaji'], category: 'curry & gravy', cuisine: 'bangladeshi', per100g: { calories: 85, protein: 1.5, carbs: 12, fat: 3.5, fiber: 1.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f103', name: 'Palak Paneer', aliases: ['saag paneer'], category: 'curry & gravy', cuisine: 'indian', per100g: { calories: 130, protein: 7.5, carbs: 5, fat: 9.5, fiber: 1.8 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f104', name: 'Chana Masala', aliases: ['chole masala'], category: 'curry & gravy', cuisine: 'indian', per100g: { calories: 120, protein: 5.5, carbs: 17, fat: 3.5, fiber: 4.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f105', name: 'Thai Green Curry', aliases: ['kaeng khiao wan'], category: 'curry & gravy', cuisine: 'thai', per100g: { calories: 95, protein: 6.0, carbs: 4.5, fat: 6.5, fiber: 1.0 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f106', name: 'Thai Red Curry', aliases: ['kaeng phet'], category: 'curry & gravy', cuisine: 'thai', per100g: { calories: 105, protein: 7.0, carbs: 5.0, fat: 7.0, fiber: 1.2 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f107', name: 'Butter Chicken', aliases: ['murgh makhani'], category: 'curry & gravy', cuisine: 'indian', per100g: { calories: 148, protein: 11, carbs: 6, fat: 9, fiber: 0.8 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f108', name: 'Mapo Tofu', aliases: ['ma po doufu'], category: 'curry & gravy', cuisine: 'chinese', per100g: { calories: 88, protein: 5.5, carbs: 4.5, fat: 5.5, fiber: 0.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f109', name: 'Dal Tadka', aliases: ['dal fry'], category: 'curry & gravy', cuisine: 'indian', per100g: { calories: 95, protein: 5.5, carbs: 13, fat: 2.5, fiber: 3.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f110', name: 'Shorshe Ilish', aliases: ['mustard hilsa'], category: 'curry & gravy', cuisine: 'bangladeshi', per100g: { calories: 220, protein: 18, carbs: 3, fat: 15, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 150 } },
  { id: 'f111', name: 'Kimchi Jjigae', aliases: ['kimchi stew'], category: 'curry & gravy', cuisine: 'korean', per100g: { calories: 55, protein: 4.0, carbs: 4.5, fat: 2.5, fiber: 1.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 300 } },

  // ═══════════════════════════════════════
  // SOUP
  // ═══════════════════════════════════════
  { id: 'f112', name: 'Miso Soup', aliases: ['misoshiru'], category: 'soup', cuisine: 'japanese', per100g: { calories: 21, protein: 1.3, carbs: 2.6, fat: 0.6, fiber: 0.4 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f113', name: 'Tom Yum Soup', aliases: [], category: 'soup', cuisine: 'thai', per100g: { calories: 30, protein: 2.0, carbs: 3.5, fat: 1.0, fiber: 0.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 300 } },
  { id: 'f114', name: 'Egg Drop Soup', aliases: ['dim er soup'], category: 'soup', cuisine: 'chinese', per100g: { calories: 29, protein: 1.7, carbs: 3.4, fat: 0.7, fiber: 0.1 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f115', name: 'Hot and Sour Soup', aliases: [], category: 'soup', cuisine: 'chinese', per100g: { calories: 35, protein: 2.0, carbs: 4.0, fat: 1.2, fiber: 0.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f116', name: 'Chicken Soup', aliases: ['murgi soup'], category: 'soup', cuisine: 'global', per100g: { calories: 36, protein: 3.5, carbs: 2.5, fat: 1.2, fiber: 0.3 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },
  { id: 'f117', name: 'Lentil Soup', aliases: ['dal soup'], category: 'soup', cuisine: 'global', per100g: { calories: 56, protein: 3.5, carbs: 9, fat: 0.7, fiber: 3.0 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 250 } },

  // ═══════════════════════════════════════
  // SNACKS & FRIED
  // ═══════════════════════════════════════
  { id: 'f118', name: 'Samosa', aliases: ['singara', 'shingara'], category: 'snacks & fried', cuisine: 'bangladeshi', per100g: { calories: 262, protein: 4.5, carbs: 30, fat: 14, fiber: 2.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 80 } },
  { id: 'f119', name: 'Pakora', aliases: ['piyaju', 'bhaji'], category: 'snacks & fried', cuisine: 'bangladeshi', per100g: { calories: 247, protein: 6.5, carbs: 26, fat: 13.5, fiber: 2.5 }, defaultUnit: 'piece', defaultQuantity: 3, unitWeightG: { piece: 25 } },
  { id: 'f120', name: 'Spring Roll', aliases: ['roll'], category: 'snacks & fried', cuisine: 'chinese', per100g: { calories: 237, protein: 5.5, carbs: 25, fat: 13, fiber: 1.5 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 65 } },
  { id: 'f121', name: 'French Fries', aliases: ['chips', 'alu fry'], category: 'snacks & fried', cuisine: 'western', per100g: { calories: 312, protein: 3.4, carbs: 41, fat: 15, fiber: 3.8 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 117 } },
  { id: 'f122', name: 'Fried Chicken', aliases: [], category: 'snacks & fried', cuisine: 'western', per100g: { calories: 246, protein: 19, carbs: 9.5, fat: 15, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 100 } },
  { id: 'f123', name: 'Tempura', aliases: [], category: 'snacks & fried', cuisine: 'japanese', per100g: { calories: 230, protein: 5.0, carbs: 25, fat: 12, fiber: 1.5 }, defaultUnit: 'piece', defaultQuantity: 3, unitWeightG: { piece: 30 } },
  { id: 'f124', name: 'Gyoza', aliases: ['dumplings', 'pot stickers', 'momo'], category: 'snacks & fried', cuisine: 'japanese', per100g: { calories: 203, protein: 8.5, carbs: 22, fat: 9, fiber: 1.0 }, defaultUnit: 'piece', defaultQuantity: 5, unitWeightG: { piece: 25 } },
  { id: 'f125', name: 'Fuchka', aliases: ['pani puri', 'golgappa', 'puchka'], category: 'snacks & fried', cuisine: 'bangladeshi', per100g: { calories: 170, protein: 3.5, carbs: 28, fat: 5.0, fiber: 2.0 }, defaultUnit: 'piece', defaultQuantity: 6, unitWeightG: { piece: 20 } },
  { id: 'f126', name: 'Chotpoti', aliases: [], category: 'snacks & fried', cuisine: 'bangladeshi', per100g: { calories: 135, protein: 5.0, carbs: 22, fat: 3.5, fiber: 4.0 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f127', name: 'Jhal Muri', aliases: ['jhalmuri', 'spicy puffed rice'], category: 'snacks & fried', cuisine: 'bangladeshi', per100g: { calories: 215, protein: 4.5, carbs: 38, fat: 5.5, fiber: 2.5 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 100 } },
  { id: 'f128', name: 'Tteokbokki', aliases: ['rice cakes', 'dukbokki'], category: 'snacks & fried', cuisine: 'korean', per100g: { calories: 195, protein: 3.0, carbs: 40, fat: 2.5, fiber: 0.5 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f129', name: 'Nachos', aliases: ['tortilla chips'], category: 'snacks & fried', cuisine: 'mexican', per100g: { calories: 500, protein: 7.0, carbs: 60, fat: 26, fiber: 4.0 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 50 } },

  // ═══════════════════════════════════════
  // SWEETS & DESSERTS
  // ═══════════════════════════════════════
  { id: 'f130', name: 'Roshogolla', aliases: ['rasgulla', 'rosogolla'], category: 'sweets & desserts', cuisine: 'bangladeshi', per100g: { calories: 186, protein: 3.5, carbs: 35, fat: 4.0, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 40 } },
  { id: 'f131', name: 'Mishti Doi', aliases: ['sweet yogurt', 'mishti dahi'], category: 'sweets & desserts', cuisine: 'bangladeshi', per100g: { calories: 120, protein: 4.0, carbs: 18, fat: 3.5, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 150 } },
  { id: 'f132', name: 'Sandesh', aliases: [], category: 'sweets & desserts', cuisine: 'bangladeshi', per100g: { calories: 280, protein: 8.0, carbs: 42, fat: 9.5, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 30 } },
  { id: 'f133', name: 'Gulab Jamun', aliases: [], category: 'sweets & desserts', cuisine: 'indian', per100g: { calories: 300, protein: 3.5, carbs: 45, fat: 12, fiber: 0.2 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 40 } },
  { id: 'f134', name: 'Jalebi', aliases: ['jilapi'], category: 'sweets & desserts', cuisine: 'bangladeshi', per100g: { calories: 380, protein: 2.5, carbs: 58, fat: 15, fiber: 0.3 }, defaultUnit: 'piece', defaultQuantity: 3, unitWeightG: { piece: 30 } },
  { id: 'f135', name: 'Payesh', aliases: ['kheer', 'rice pudding'], category: 'sweets & desserts', cuisine: 'bangladeshi', per100g: { calories: 125, protein: 3.5, carbs: 18, fat: 4.5, fiber: 0.2 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f136', name: 'Mochi', aliases: ['rice cake dessert'], category: 'sweets & desserts', cuisine: 'japanese', per100g: { calories: 240, protein: 3.5, carbs: 53, fat: 0.5, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 35 } },
  { id: 'f137', name: 'Ice Cream', aliases: ['kulfi'], category: 'sweets & desserts', cuisine: 'global', per100g: { calories: 207, protein: 3.5, carbs: 24, fat: 11, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 132 } },
  { id: 'f138', name: 'Chocolate', aliases: ['chocolate bar'], category: 'sweets & desserts', cuisine: 'global', per100g: { calories: 546, protein: 5.0, carbs: 60, fat: 31, fiber: 7.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 40 } },
  { id: 'f139', name: 'Mango Sticky Rice', aliases: ['khao niaow mamuang'], category: 'sweets & desserts', cuisine: 'thai', per100g: { calories: 165, protein: 2.5, carbs: 32, fat: 3.5, fiber: 1.0 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f140', name: 'Hotteok', aliases: ['korean pancake'], category: 'sweets & desserts', cuisine: 'korean', per100g: { calories: 270, protein: 4.0, carbs: 45, fat: 8.5, fiber: 1.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 100 } },
  { id: 'f141', name: 'Churros', aliases: [], category: 'sweets & desserts', cuisine: 'mexican', per100g: { calories: 380, protein: 4.5, carbs: 43, fat: 21, fiber: 1.0 }, defaultUnit: 'piece', defaultQuantity: 3, unitWeightG: { piece: 26 } },

  // ═══════════════════════════════════════
  // BEVERAGES
  // ═══════════════════════════════════════
  { id: 'f142', name: 'Tea (with milk & sugar)', aliases: ['cha', 'chai'], category: 'beverages', cuisine: 'bangladeshi', per100g: { calories: 35, protein: 0.8, carbs: 6.0, fat: 0.8, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 200 } },
  { id: 'f143', name: 'Black Coffee', aliases: ['kopi', 'coffee'], category: 'beverages', cuisine: 'global', per100g: { calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 237 } },
  { id: 'f144', name: 'Green Tea', aliases: [], category: 'beverages', cuisine: 'japanese', per100g: { calories: 1, protein: 0.2, carbs: 0, fat: 0, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 237 } },
  { id: 'f145', name: 'Mango Lassi', aliases: ['aam er lassi'], category: 'beverages', cuisine: 'bangladeshi', per100g: { calories: 72, protein: 2.2, carbs: 12, fat: 2.0, fiber: 0.3 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 250 } },
  { id: 'f146', name: 'Coconut Water', aliases: ['daber pani'], category: 'beverages', cuisine: 'global', per100g: { calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 240 } },
  { id: 'f147', name: 'Orange Juice', aliases: ['OJ', 'komla juice'], category: 'beverages', cuisine: 'global', per100g: { calories: 45, protein: 0.7, carbs: 10, fat: 0.2, fiber: 0.2 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 248 } },
  { id: 'f148', name: 'Sugarcane Juice', aliases: ['akher ras'], category: 'beverages', cuisine: 'bangladeshi', per100g: { calories: 40, protein: 0.2, carbs: 10, fat: 0, fiber: 0 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 250 } },
  { id: 'f149', name: 'Lemonade', aliases: ['lemon sharbat', 'lebu pani'], category: 'beverages', cuisine: 'global', per100g: { calories: 40, protein: 0.1, carbs: 10.5, fat: 0.04, fiber: 0.1 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 250 } },
  { id: 'f150', name: 'Boba Tea', aliases: ['bubble tea', 'pearl milk tea'], category: 'beverages', cuisine: 'chinese', per100g: { calories: 55, protein: 0.4, carbs: 12, fat: 0.8, fiber: 0.1 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 350 } },
  { id: 'f151', name: 'Matcha Latte', aliases: [], category: 'beverages', cuisine: 'japanese', per100g: { calories: 45, protein: 1.5, carbs: 6, fat: 1.5, fiber: 0.3 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 250 } },

  // ═══════════════════════════════════════
  // CONDIMENTS & SAUCES
  // ═══════════════════════════════════════
  { id: 'f152', name: 'Soy Sauce', aliases: ['shoyu'], category: 'condiments & sauces', cuisine: 'chinese', per100g: { calories: 53, protein: 8.1, carbs: 4.9, fat: 0.04, fiber: 0.8 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 16 } },
  { id: 'f153', name: 'Fish Sauce', aliases: ['nam pla'], category: 'condiments & sauces', cuisine: 'thai', per100g: { calories: 35, protein: 5.1, carbs: 3.6, fat: 0.01, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 18 } },
  { id: 'f154', name: 'Ketchup', aliases: ['tomato sauce'], category: 'condiments & sauces', cuisine: 'western', per100g: { calories: 101, protein: 1.0, carbs: 27, fat: 0.1, fiber: 0.3 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 17 } },
  { id: 'f155', name: 'Chili Sauce', aliases: ['sriracha', 'hot sauce'], category: 'condiments & sauces', cuisine: 'thai', per100g: { calories: 93, protein: 1.5, carbs: 21, fat: 0.5, fiber: 1.5 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 15 } },
  { id: 'f156', name: 'Gochujang', aliases: ['korean chili paste'], category: 'condiments & sauces', cuisine: 'korean', per100g: { calories: 200, protein: 4.0, carbs: 40, fat: 1.5, fiber: 3.0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 16 } },
  { id: 'f157', name: 'Tahini', aliases: ['sesame paste'], category: 'condiments & sauces', cuisine: 'mediterranean', per100g: { calories: 595, protein: 17, carbs: 21, fat: 54, fiber: 9.3 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 15 } },
  { id: 'f158', name: 'Mayonnaise', aliases: ['mayo'], category: 'condiments & sauces', cuisine: 'western', per100g: { calories: 680, protein: 1.0, carbs: 0.6, fat: 75, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },
  { id: 'f159', name: 'Mustard Paste', aliases: ['kashundi', 'shorshe'], category: 'condiments & sauces', cuisine: 'bangladeshi', per100g: { calories: 66, protein: 4.4, carbs: 5.3, fat: 3.3, fiber: 3.3 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 15 } },

  // ═══════════════════════════════════════
  // NUTS & SEEDS
  // ═══════════════════════════════════════
  { id: 'f160', name: 'Almonds', aliases: ['badam'], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12 }, defaultUnit: 'g', defaultQuantity: 28, unitWeightG: { piece: 1.2 } },
  { id: 'f161', name: 'Cashews', aliases: ['kaju'], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3 }, defaultUnit: 'g', defaultQuantity: 28, unitWeightG: { piece: 1.5 } },
  { id: 'f162', name: 'Peanuts', aliases: ['badam', 'moongphali', 'china badam'], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5 }, defaultUnit: 'g', defaultQuantity: 28 },
  { id: 'f163', name: 'Walnuts', aliases: ['akhrot'], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7 }, defaultUnit: 'g', defaultQuantity: 28 },
  { id: 'f164', name: 'Sesame Seeds', aliases: ['til'], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 573, protein: 18, carbs: 23, fat: 50, fiber: 12 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 9 } },
  { id: 'f165', name: 'Chia Seeds', aliases: [], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 12 } },
  { id: 'f166', name: 'Flax Seeds', aliases: ['tisi'], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 534, protein: 18, carbs: 29, fat: 42, fiber: 27 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 10 } },
  { id: 'f167', name: 'Pistachios', aliases: ['pesta'], category: 'nuts & seeds', cuisine: 'global', per100g: { calories: 560, protein: 20, carbs: 28, fat: 45, fiber: 10 }, defaultUnit: 'g', defaultQuantity: 28 },

  // ═══════════════════════════════════════
  // OILS & FATS
  // ═══════════════════════════════════════
  { id: 'f168', name: 'Olive Oil', aliases: [], category: 'oils & fats', cuisine: 'mediterranean', per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },
  { id: 'f169', name: 'Mustard Oil', aliases: ['shorsher tel'], category: 'oils & fats', cuisine: 'bangladeshi', per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },
  { id: 'f170', name: 'Coconut Oil', aliases: ['narikeler tel'], category: 'oils & fats', cuisine: 'global', per100g: { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },
  { id: 'f171', name: 'Soybean Oil', aliases: ['soyabin tel'], category: 'oils & fats', cuisine: 'global', per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },
  { id: 'f172', name: 'Sesame Oil', aliases: ['til er tel'], category: 'oils & fats', cuisine: 'chinese', per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 14 } },

  // ═══════════════════════════════════════
  // SPECIAL / REGIONAL DISHES
  // ═══════════════════════════════════════
  { id: 'f173', name: 'Sushi Roll', aliases: ['maki'], category: 'rice & grains', cuisine: 'japanese', per100g: { calories: 140, protein: 5.0, carbs: 23, fat: 3.5, fiber: 1.0 }, defaultUnit: 'piece', defaultQuantity: 6, unitWeightG: { piece: 30 } },
  { id: 'f174', name: 'Sashimi', aliases: [], category: 'fish & seafood', cuisine: 'japanese', per100g: { calories: 127, protein: 26, carbs: 0, fat: 2.0, fiber: 0 }, defaultUnit: 'piece', defaultQuantity: 5, unitWeightG: { piece: 28 } },
  { id: 'f175', name: 'Bibimbap', aliases: [], category: 'rice & grains', cuisine: 'korean', per100g: { calories: 120, protein: 5.5, carbs: 17, fat: 3.5, fiber: 1.5 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 400 } },
  { id: 'f176', name: 'Kimchi', aliases: [], category: 'vegetables', cuisine: 'korean', per100g: { calories: 15, protein: 1.1, carbs: 2.4, fat: 0.5, fiber: 1.6 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 150 } },
  { id: 'f177', name: 'Kimbap', aliases: ['gimbap'], category: 'rice & grains', cuisine: 'korean', per100g: { calories: 135, protein: 4.5, carbs: 22, fat: 3.0, fiber: 1.0 }, defaultUnit: 'piece', defaultQuantity: 8, unitWeightG: { piece: 25 } },
  { id: 'f178', name: 'Pad Thai', aliases: [], category: 'noodles & pasta', cuisine: 'thai', per100g: { calories: 128, protein: 5.5, carbs: 17, fat: 4.5, fiber: 1.0 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 300 } },
  { id: 'f179', name: 'Kung Pao Chicken', aliases: ['gong bao ji ding'], category: 'meat & poultry', cuisine: 'chinese', per100g: { calories: 145, protein: 14, carbs: 8, fat: 7, fiber: 1.0 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f180', name: 'Sweet and Sour Pork', aliases: ['gu lao rou'], category: 'meat & poultry', cuisine: 'chinese', per100g: { calories: 165, protein: 10, carbs: 18, fat: 6.5, fiber: 0.5 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f181', name: 'Dim Sum (Har Gow)', aliases: ['shrimp dumplings'], category: 'snacks & fried', cuisine: 'chinese', per100g: { calories: 147, protein: 8.5, carbs: 17, fat: 5, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 4, unitWeightG: { piece: 30 } },
  { id: 'f182', name: 'Bulgogi', aliases: ['korean BBQ beef'], category: 'meat & poultry', cuisine: 'korean', per100g: { calories: 160, protein: 17, carbs: 8, fat: 7, fiber: 0.5 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f183', name: 'Tonkatsu', aliases: ['pork cutlet'], category: 'meat & poultry', cuisine: 'japanese', per100g: { calories: 250, protein: 18, carbs: 14, fat: 14, fiber: 0.8 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 150 } },
  { id: 'f184', name: 'Tacos', aliases: ['taco'], category: 'snacks & fried', cuisine: 'mexican', per100g: { calories: 210, protein: 9.5, carbs: 20, fat: 10, fiber: 2.5 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 80 } },
  { id: 'f185', name: 'Burrito', aliases: [], category: 'snacks & fried', cuisine: 'mexican', per100g: { calories: 155, protein: 6.5, carbs: 18, fat: 6.5, fiber: 2.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 280 } },
  { id: 'f186', name: 'Pizza (Cheese)', aliases: ['pizza slice'], category: 'snacks & fried', cuisine: 'western', per100g: { calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2.3 }, defaultUnit: 'slice', defaultQuantity: 2, unitWeightG: { slice: 107 } },
  { id: 'f187', name: 'Hamburger', aliases: ['burger'], category: 'snacks & fried', cuisine: 'western', per100g: { calories: 264, protein: 13, carbs: 24, fat: 13, fiber: 1.3 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 215 } },
  { id: 'f188', name: 'Sandwich', aliases: ['sub'], category: 'bread & roti', cuisine: 'western', per100g: { calories: 230, protein: 10, carbs: 25, fat: 10, fiber: 2.0 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 200 } },
  { id: 'f189', name: 'Falafel', aliases: [], category: 'snacks & fried', cuisine: 'mediterranean', per100g: { calories: 333, protein: 13, carbs: 32, fat: 18, fiber: 4.9 }, defaultUnit: 'piece', defaultQuantity: 4, unitWeightG: { piece: 17 } },
  { id: 'f190', name: 'Hummus', aliases: [], category: 'condiments & sauces', cuisine: 'mediterranean', per100g: { calories: 166, protein: 8.0, carbs: 14, fat: 9.6, fiber: 6.0 }, defaultUnit: 'tbsp', defaultQuantity: 2, unitWeightG: { tbsp: 30 } },
  { id: 'f191', name: 'Dosa', aliases: [], category: 'bread & roti', cuisine: 'indian', per100g: { calories: 168, protein: 4.0, carbs: 27, fat: 5.0, fiber: 1.2 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 100 } },
  { id: 'f192', name: 'Idli', aliases: [], category: 'bread & roti', cuisine: 'indian', per100g: { calories: 130, protein: 3.5, carbs: 26, fat: 0.8, fiber: 1.0 }, defaultUnit: 'piece', defaultQuantity: 2, unitWeightG: { piece: 40 } },
  { id: 'f193', name: 'Upma', aliases: [], category: 'rice & grains', cuisine: 'indian', per100g: { calories: 95, protein: 2.5, carbs: 15, fat: 3.0, fiber: 1.2 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 200 } },
  { id: 'f194', name: 'Pho', aliases: ['vietnamese pho'], category: 'soup', cuisine: 'global', per100g: { calories: 40, protein: 3.5, carbs: 4.5, fat: 1.0, fiber: 0.3 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 400 } },
  { id: 'f195', name: 'Som Tam', aliases: ['papaya salad'], category: 'vegetables', cuisine: 'thai', per100g: { calories: 35, protein: 1.0, carbs: 7, fat: 0.5, fiber: 2.0 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f196', name: 'Satay Chicken', aliases: ['sate'], category: 'meat & poultry', cuisine: 'thai', per100g: { calories: 190, protein: 20, carbs: 6, fat: 10, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 3, unitWeightG: { piece: 30 } },
  { id: 'f197', name: 'Teriyaki Chicken', aliases: [], category: 'meat & poultry', cuisine: 'japanese', per100g: { calories: 155, protein: 22, carbs: 7, fat: 4.5, fiber: 0.2 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f198', name: 'Japchae', aliases: ['korean glass noodles'], category: 'noodles & pasta', cuisine: 'korean', per100g: { calories: 105, protein: 3.0, carbs: 19, fat: 2.5, fiber: 1.2 }, defaultUnit: 'serving', defaultQuantity: 1, unitWeightG: { serving: 200 } },
  { id: 'f199', name: 'Honey', aliases: ['modhu'], category: 'condiments & sauces', cuisine: 'global', per100g: { calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 21 } },
  { id: 'f200', name: 'Sugar', aliases: ['chini'], category: 'condiments & sauces', cuisine: 'global', per100g: { calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0 }, defaultUnit: 'tsp', defaultQuantity: 1, unitWeightG: { tsp: 4 } },
  { id: 'f201', name: 'Avocado', aliases: [], category: 'fruits', cuisine: 'global', per100g: { calories: 160, protein: 2.0, carbs: 9.0, fat: 15, fiber: 6.7 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 150 } },
  { id: 'f202', name: 'Chow Mein', aliases: [], category: 'noodles & pasta', cuisine: 'chinese', per100g: { calories: 148, protein: 5.5, carbs: 21, fat: 5.0, fiber: 1.5 }, defaultUnit: 'plate', defaultQuantity: 1, unitWeightG: { plate: 300 } },
  { id: 'f203', name: 'Donburi (Rice Bowl)', aliases: ['gyudon', 'katsudon'], category: 'rice & grains', cuisine: 'japanese', per100g: { calories: 145, protein: 7.0, carbs: 20, fat: 4.5, fiber: 0.8 }, defaultUnit: 'bowl', defaultQuantity: 1, unitWeightG: { bowl: 400 } },
  { id: 'f204', name: 'Onigiri', aliases: ['rice ball'], category: 'rice & grains', cuisine: 'japanese', per100g: { calories: 143, protein: 3.5, carbs: 30, fat: 0.8, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 100 } },
  { id: 'f205', name: 'Korean Fried Chicken', aliases: ['yangnyeom chicken'], category: 'snacks & fried', cuisine: 'korean', per100g: { calories: 260, protein: 17, carbs: 14, fat: 15, fiber: 0.5 }, defaultUnit: 'piece', defaultQuantity: 3, unitWeightG: { piece: 50 } },
  { id: 'f206', name: 'Quesadilla', aliases: [], category: 'snacks & fried', cuisine: 'mexican', per100g: { calories: 270, protein: 12, carbs: 22, fat: 15, fiber: 1.5 }, defaultUnit: 'piece', defaultQuantity: 1, unitWeightG: { piece: 150 } },
  { id: 'f207', name: 'Guacamole', aliases: [], category: 'condiments & sauces', cuisine: 'mexican', per100g: { calories: 160, protein: 2.0, carbs: 9, fat: 15, fiber: 6.0 }, defaultUnit: 'tbsp', defaultQuantity: 2, unitWeightG: { tbsp: 30 } },
  { id: 'f208', name: 'Peanut Butter', aliases: [], category: 'condiments & sauces', cuisine: 'western', per100g: { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6.0 }, defaultUnit: 'tbsp', defaultQuantity: 1, unitWeightG: { tbsp: 16 } },
  { id: 'f209', name: 'Granola', aliases: [], category: 'rice & grains', cuisine: 'western', per100g: { calories: 471, protein: 10, carbs: 64, fat: 20, fiber: 6.5 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 55 } },
  { id: 'f210', name: 'Cereal (cornflakes)', aliases: ['breakfast cereal'], category: 'rice & grains', cuisine: 'western', per100g: { calories: 357, protein: 8.0, carbs: 84, fat: 0.4, fiber: 3.3 }, defaultUnit: 'cup', defaultQuantity: 1, unitWeightG: { cup: 30 } },
];
