import type { Recipe } from '@/types/nutrition';

export const RECIPE_DATABASE: Recipe[] = [
  // ═══════════════════════════════════════
  // BANGLADESHI RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r001', name: 'Chicken Biryani', cuisine: 'bangladeshi', mealType: 'lunch', servings: 4,
    prepTimeMin: 30, cookTimeMin: 45, calories: 520, healthScore: 55,
    nutrition: { calories: 520, protein: 28, carbs: 58, fat: 18, fiber: 2 },
    ingredients: [
      { name: 'Basmati Rice', quantity: 400, unit: 'g' },
      { name: 'Chicken Thigh', quantity: 500, unit: 'g' },
      { name: 'Onion', quantity: 200, unit: 'g' },
      { name: 'Yogurt', quantity: 100, unit: 'g' },
      { name: 'Ghee', quantity: 30, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Marinate chicken with yogurt, turmeric, chili powder, and salt for 30 minutes.' },
      { step: 2, instruction: 'Soak basmati rice for 20 minutes, then parboil until 70% done.' },
      { step: 3, instruction: 'Fry sliced onions in ghee until golden brown.' },
      { step: 4, instruction: 'Cook marinated chicken in the same pot until half done.' },
      { step: 5, instruction: 'Layer rice over chicken, add saffron milk, cover tightly and cook on low heat for 25 minutes.' },
    ],
    tags: ['festive', 'aromatic', 'one-pot'], imageEmoji: '🍛',
  },
  {
    id: 'r002', name: 'Shorshe Ilish', cuisine: 'bangladeshi', mealType: 'lunch', servings: 4,
    prepTimeMin: 15, cookTimeMin: 25, calories: 380, healthScore: 72,
    nutrition: { calories: 380, protein: 28, carbs: 5, fat: 28, fiber: 1 },
    ingredients: [
      { name: 'Hilsa Fish', quantity: 4, unit: 'piece' },
      { name: 'Mustard Paste', quantity: 60, unit: 'g' },
      { name: 'Mustard Oil', quantity: 30, unit: 'g' },
      { name: 'Green Chili', quantity: 4, unit: 'piece' },
    ],
    steps: [
      { step: 1, instruction: 'Clean and lightly fry hilsa pieces in mustard oil.' },
      { step: 2, instruction: 'Mix mustard paste with water, turmeric, salt, and green chilies.' },
      { step: 3, instruction: 'Pour mustard mixture over fish, add a drizzle of mustard oil.' },
      { step: 4, instruction: 'Cover and cook on low heat for 20 minutes until oil separates.' },
    ],
    tags: ['traditional', 'omega-3', 'spicy'], imageEmoji: '🐟',
  },
  {
    id: 'r003', name: 'Bhuna Khichuri', cuisine: 'bangladeshi', mealType: 'lunch', servings: 4,
    prepTimeMin: 15, cookTimeMin: 35, calories: 340, healthScore: 68,
    nutrition: { calories: 340, protein: 12, carbs: 48, fat: 12, fiber: 5 },
    ingredients: [
      { name: 'Basmati Rice', quantity: 200, unit: 'g' },
      { name: 'Red Lentils', quantity: 100, unit: 'g' },
      { name: 'Onion', quantity: 100, unit: 'g' },
      { name: 'Potato', quantity: 150, unit: 'g' },
      { name: 'Ghee', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Wash and soak rice and lentils together for 15 minutes.' },
      { step: 2, instruction: 'Fry onions and potatoes with whole spices in ghee.' },
      { step: 3, instruction: 'Add rice-lentil mix with turmeric, cumin, and water.' },
      { step: 4, instruction: 'Cook covered on low heat until everything is soft and fragrant.' },
    ],
    tags: ['comfort-food', 'rainy-day', 'one-pot'], imageEmoji: '🍲',
  },
  {
    id: 'r004', name: 'Macher Jhol', cuisine: 'bangladeshi', mealType: 'lunch', servings: 4,
    prepTimeMin: 10, cookTimeMin: 20, calories: 220, healthScore: 78,
    nutrition: { calories: 220, protein: 22, carbs: 8, fat: 11, fiber: 2 },
    ingredients: [
      { name: 'Rohu Fish', quantity: 4, unit: 'piece' },
      { name: 'Potato', quantity: 150, unit: 'g' },
      { name: 'Tomato', quantity: 100, unit: 'g' },
      { name: 'Onion', quantity: 80, unit: 'g' },
      { name: 'Mustard Oil', quantity: 15, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Lightly fry fish pieces in mustard oil, set aside.' },
      { step: 2, instruction: 'In the same oil, cook onions, potatoes, and tomatoes with turmeric.' },
      { step: 3, instruction: 'Add water and bring to a simmer.' },
      { step: 4, instruction: 'Add fish, cook gently for 10 minutes. Garnish with fresh coriander.' },
    ],
    tags: ['everyday', 'light', 'protein-rich'], imageEmoji: '🐠',
  },
  {
    id: 'r005', name: 'Beef Bhuna', cuisine: 'bangladeshi', mealType: 'dinner', servings: 4,
    prepTimeMin: 20, cookTimeMin: 90, calories: 450, healthScore: 48,
    nutrition: { calories: 450, protein: 32, carbs: 8, fat: 32, fiber: 2 },
    ingredients: [
      { name: 'Beef', quantity: 500, unit: 'g' },
      { name: 'Onion', quantity: 200, unit: 'g' },
      { name: 'Yogurt', quantity: 50, unit: 'g' },
      { name: 'Mustard Oil', quantity: 30, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Marinate beef with yogurt, ginger-garlic paste, and spices.' },
      { step: 2, instruction: 'Slow cook onions until deeply caramelized.' },
      { step: 3, instruction: 'Add beef and cook on medium heat, stirring occasionally.' },
      { step: 4, instruction: 'Reduce until oil separates and beef is tender (about 90 min).' },
    ],
    tags: ['slow-cooked', 'rich', 'festive'], imageEmoji: '🥩',
  },
  {
    id: 'r006', name: 'Masoor Dal', cuisine: 'bangladeshi', mealType: 'lunch', servings: 4,
    prepTimeMin: 5, cookTimeMin: 20, calories: 180, healthScore: 85,
    nutrition: { calories: 180, protein: 12, carbs: 28, fat: 3, fiber: 8 },
    ingredients: [
      { name: 'Red Lentils', quantity: 200, unit: 'g' },
      { name: 'Onion', quantity: 80, unit: 'g' },
      { name: 'Tomato', quantity: 60, unit: 'g' },
      { name: 'Mustard Oil', quantity: 10, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Wash lentils and boil with turmeric and salt until soft.' },
      { step: 2, instruction: 'Prepare tadka by frying onions, garlic, and dried chilies in mustard oil.' },
      { step: 3, instruction: 'Pour tadka over cooked dal, add chopped tomatoes.' },
      { step: 4, instruction: 'Simmer for 5 minutes and serve with rice.' },
    ],
    tags: ['everyday', 'high-fiber', 'budget-friendly'], imageEmoji: '🫕',
  },
  {
    id: 'r007', name: 'Alu Begun Bhaja', cuisine: 'bangladeshi', mealType: 'lunch', servings: 3,
    prepTimeMin: 10, cookTimeMin: 15, calories: 200, healthScore: 55,
    nutrition: { calories: 200, protein: 3, carbs: 22, fat: 12, fiber: 3 },
    ingredients: [
      { name: 'Potato', quantity: 200, unit: 'g' },
      { name: 'Eggplant', quantity: 200, unit: 'g' },
      { name: 'Mustard Oil', quantity: 30, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Slice potatoes and eggplant into thin rounds.' },
      { step: 2, instruction: 'Marinate with turmeric, salt, and a pinch of chili powder.' },
      { step: 3, instruction: 'Shallow fry in mustard oil until golden and crispy.' },
    ],
    tags: ['side-dish', 'comfort-food', 'vegetarian'], imageEmoji: '🍆',
  },
  {
    id: 'r008', name: 'Chingri Malai Curry', cuisine: 'bangladeshi', mealType: 'dinner', servings: 4,
    prepTimeMin: 15, cookTimeMin: 25, calories: 310, healthScore: 65,
    nutrition: { calories: 310, protein: 24, carbs: 8, fat: 20, fiber: 1 },
    ingredients: [
      { name: 'Shrimp', quantity: 400, unit: 'g' },
      { name: 'Coconut (fresh)', quantity: 100, unit: 'g' },
      { name: 'Onion', quantity: 80, unit: 'g' },
      { name: 'Mustard Oil', quantity: 15, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Clean and devein shrimp, marinate with turmeric and salt.' },
      { step: 2, instruction: 'Blend fresh coconut to make coconut milk.' },
      { step: 3, instruction: 'Fry onions and shrimp lightly, add coconut milk.' },
      { step: 4, instruction: 'Simmer on low heat until curry thickens.' },
    ],
    tags: ['creamy', 'festive', 'seafood'], imageEmoji: '🦐',
  },
  {
    id: 'r009', name: 'Chicken Rezala', cuisine: 'bangladeshi', mealType: 'dinner', servings: 4,
    prepTimeMin: 20, cookTimeMin: 40, calories: 380, healthScore: 58,
    nutrition: { calories: 380, protein: 30, carbs: 6, fat: 26, fiber: 1 },
    ingredients: [
      { name: 'Chicken Thigh', quantity: 500, unit: 'g' },
      { name: 'Yogurt', quantity: 100, unit: 'g' },
      { name: 'Onion', quantity: 150, unit: 'g' },
      { name: 'Cashews', quantity: 30, unit: 'g' },
      { name: 'Ghee', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Marinate chicken with yogurt, white pepper, and cardamom.' },
      { step: 2, instruction: 'Make a paste of cashews and poppy seeds.' },
      { step: 3, instruction: 'Cook onions in ghee, add chicken, then cashew paste.' },
      { step: 4, instruction: 'Simmer until chicken is tender and gravy is creamy.' },
    ],
    tags: ['mughlai', 'creamy', 'festive'], imageEmoji: '👑',
  },
  {
    id: 'r010', name: 'Payesh', cuisine: 'bangladeshi', mealType: 'snack', servings: 6,
    prepTimeMin: 5, cookTimeMin: 40, calories: 250, healthScore: 42,
    nutrition: { calories: 250, protein: 7, carbs: 36, fat: 9, fiber: 0.5 },
    ingredients: [
      { name: 'Milk', quantity: 1000, unit: 'ml' },
      { name: 'Basmati Rice', quantity: 60, unit: 'g' },
      { name: 'Sugar', quantity: 80, unit: 'g' },
      { name: 'Cashews', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Soak rice for 15 minutes, drain.' },
      { step: 2, instruction: 'Boil milk, add rice, and stir continuously on low heat.' },
      { step: 3, instruction: 'Cook until rice is soft and milk thickens (about 30 min).' },
      { step: 4, instruction: 'Add sugar, cardamom, and garnish with cashews.' },
    ],
    tags: ['dessert', 'traditional', 'festive'], imageEmoji: '🍮',
  },

  // ═══════════════════════════════════════
  // INDIAN RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r011', name: 'Butter Chicken', cuisine: 'indian', mealType: 'dinner', servings: 4,
    prepTimeMin: 20, cookTimeMin: 30, calories: 440, healthScore: 50,
    nutrition: { calories: 440, protein: 32, carbs: 12, fat: 30, fiber: 2 },
    ingredients: [
      { name: 'Chicken Breast', quantity: 500, unit: 'g' },
      { name: 'Yogurt', quantity: 100, unit: 'g' },
      { name: 'Tomato', quantity: 300, unit: 'g' },
      { name: 'Butter', quantity: 50, unit: 'g' },
      { name: 'Onion', quantity: 100, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Marinate chicken in yogurt and spices for 2 hours.' },
      { step: 2, instruction: 'Grill or pan-sear chicken until charred.' },
      { step: 3, instruction: 'Make gravy with butter, onions, tomatoes, and cream.' },
      { step: 4, instruction: 'Add chicken to gravy and simmer for 15 minutes.' },
    ],
    tags: ['creamy', 'popular', 'restaurant-style'], imageEmoji: '🧈',
  },
  {
    id: 'r012', name: 'Palak Paneer', cuisine: 'indian', mealType: 'lunch', servings: 4,
    prepTimeMin: 15, cookTimeMin: 25, calories: 280, healthScore: 72,
    nutrition: { calories: 280, protein: 16, carbs: 10, fat: 20, fiber: 4 },
    ingredients: [
      { name: 'Paneer', quantity: 250, unit: 'g' },
      { name: 'Spinach', quantity: 400, unit: 'g' },
      { name: 'Onion', quantity: 80, unit: 'g' },
      { name: 'Tomato', quantity: 100, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Blanch spinach and puree until smooth.' },
      { step: 2, instruction: 'Cube paneer and lightly fry until golden.' },
      { step: 3, instruction: 'Cook onions and tomatoes, add spinach puree.' },
      { step: 4, instruction: 'Add paneer, season with garam masala, and simmer.' },
    ],
    tags: ['vegetarian', 'iron-rich', 'protein'], imageEmoji: '🥬',
  },
  {
    id: 'r013', name: 'Chana Masala', cuisine: 'indian', mealType: 'lunch', servings: 4,
    prepTimeMin: 10, cookTimeMin: 30, calories: 260, healthScore: 80,
    nutrition: { calories: 260, protein: 12, carbs: 38, fat: 7, fiber: 10 },
    ingredients: [
      { name: 'Chickpeas', quantity: 400, unit: 'g' },
      { name: 'Onion', quantity: 100, unit: 'g' },
      { name: 'Tomato', quantity: 150, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cook chickpeas until tender (or use canned).' },
      { step: 2, instruction: 'Make masala with onions, tomatoes, and spices.' },
      { step: 3, instruction: 'Add chickpeas to masala, simmer for 15 minutes.' },
      { step: 4, instruction: 'Garnish with fresh coriander and lemon juice.' },
    ],
    tags: ['vegan', 'high-fiber', 'protein'], imageEmoji: '🫘',
  },
  {
    id: 'r014', name: 'Dal Tadka', cuisine: 'indian', mealType: 'dinner', servings: 4,
    prepTimeMin: 5, cookTimeMin: 25, calories: 200, healthScore: 82,
    nutrition: { calories: 200, protein: 12, carbs: 28, fat: 5, fiber: 7 },
    ingredients: [
      { name: 'Yellow Lentils', quantity: 200, unit: 'g' },
      { name: 'Onion', quantity: 60, unit: 'g' },
      { name: 'Tomato', quantity: 80, unit: 'g' },
      { name: 'Ghee', quantity: 15, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Boil lentils with turmeric until soft.' },
      { step: 2, instruction: 'Prepare tadka with ghee, cumin, garlic, and dried chilies.' },
      { step: 3, instruction: 'Add chopped tomatoes and cook until soft.' },
      { step: 4, instruction: 'Pour tadka over dal and mix well.' },
    ],
    tags: ['everyday', 'comfort-food', 'high-protein'], imageEmoji: '🥣',
  },
  {
    id: 'r015', name: 'Tandoori Chicken', cuisine: 'indian', mealType: 'dinner', servings: 4,
    prepTimeMin: 240, cookTimeMin: 30, calories: 280, healthScore: 75,
    nutrition: { calories: 280, protein: 35, carbs: 6, fat: 12, fiber: 1 },
    ingredients: [
      { name: 'Chicken Thigh', quantity: 600, unit: 'g' },
      { name: 'Yogurt', quantity: 150, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Marinate chicken in yogurt, tandoori masala, lemon juice for 4 hours.' },
      { step: 2, instruction: 'Preheat oven to 220°C (430°F).' },
      { step: 3, instruction: 'Bake chicken for 25-30 minutes, basting with butter.' },
      { step: 4, instruction: 'Serve with mint chutney and onion rings.' },
    ],
    tags: ['high-protein', 'grilled', 'popular'], imageEmoji: '🍗',
  },
  {
    id: 'r016', name: 'Masala Dosa', cuisine: 'indian', mealType: 'breakfast', servings: 2,
    prepTimeMin: 10, cookTimeMin: 15, calories: 280, healthScore: 65,
    nutrition: { calories: 280, protein: 6, carbs: 42, fat: 10, fiber: 3 },
    ingredients: [
      { name: 'Dosa', quantity: 2, unit: 'piece' },
      { name: 'Potato', quantity: 200, unit: 'g' },
      { name: 'Onion', quantity: 60, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Boil and mash potatoes, season with mustard seeds and curry leaves.' },
      { step: 2, instruction: 'Spread dosa batter on hot griddle, cook until crispy.' },
      { step: 3, instruction: 'Fill with potato mixture, fold and serve with sambar and chutney.' },
    ],
    tags: ['south-indian', 'crispy', 'vegetarian'], imageEmoji: '🥞',
  },

  // ═══════════════════════════════════════
  // CHINESE RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r017', name: 'Kung Pao Chicken', cuisine: 'chinese', mealType: 'dinner', servings: 4,
    prepTimeMin: 15, cookTimeMin: 15, calories: 320, healthScore: 62,
    nutrition: { calories: 320, protein: 28, carbs: 16, fat: 16, fiber: 2 },
    ingredients: [
      { name: 'Chicken Breast', quantity: 400, unit: 'g' },
      { name: 'Peanuts', quantity: 50, unit: 'g' },
      { name: 'Bell Pepper', quantity: 100, unit: 'g' },
      { name: 'Soy Sauce', quantity: 30, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cube chicken, marinate with soy sauce and cornstarch.' },
      { step: 2, instruction: 'Stir-fry chicken in wok until golden.' },
      { step: 3, instruction: 'Add dried chilies, peanuts, and bell peppers.' },
      { step: 4, instruction: 'Toss with kung pao sauce (soy, vinegar, sugar, sesame oil).' },
    ],
    tags: ['spicy', 'stir-fry', 'classic'], imageEmoji: '🥜',
  },
  {
    id: 'r018', name: 'Egg Fried Rice', cuisine: 'chinese', mealType: 'lunch', servings: 3,
    prepTimeMin: 5, cookTimeMin: 10, calories: 380, healthScore: 52,
    nutrition: { calories: 380, protein: 12, carbs: 48, fat: 15, fiber: 2 },
    ingredients: [
      { name: 'White Rice', quantity: 400, unit: 'g' },
      { name: 'Egg', quantity: 3, unit: 'piece' },
      { name: 'Green Beans', quantity: 50, unit: 'g' },
      { name: 'Soy Sauce', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Use day-old cold rice for best results.' },
      { step: 2, instruction: 'Scramble eggs in hot wok, set aside.' },
      { step: 3, instruction: 'Stir-fry vegetables, add rice and toss on high heat.' },
      { step: 4, instruction: 'Add eggs back, season with soy sauce and sesame oil.' },
    ],
    tags: ['quick', 'budget-friendly', 'comfort-food'], imageEmoji: '🍳',
  },
  {
    id: 'r019', name: 'Mapo Tofu', cuisine: 'chinese', mealType: 'dinner', servings: 4,
    prepTimeMin: 10, cookTimeMin: 15, calories: 250, healthScore: 70,
    nutrition: { calories: 250, protein: 16, carbs: 12, fat: 16, fiber: 2 },
    ingredients: [
      { name: 'Tofu', quantity: 400, unit: 'g' },
      { name: 'Ground Beef', quantity: 100, unit: 'g' },
      { name: 'Soy Sauce', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cube tofu and blanch in salted water.' },
      { step: 2, instruction: 'Brown ground meat with doubanjiang (chili bean paste).' },
      { step: 3, instruction: 'Add tofu, stock, and soy sauce. Simmer 8 minutes.' },
      { step: 4, instruction: 'Thicken with cornstarch slurry, garnish with Sichuan pepper.' },
    ],
    tags: ['spicy', 'sichuan', 'protein-rich'], imageEmoji: '🌶️',
  },
  {
    id: 'r020', name: 'Sweet and Sour Pork', cuisine: 'chinese', mealType: 'dinner', servings: 4,
    prepTimeMin: 20, cookTimeMin: 15, calories: 380, healthScore: 45,
    nutrition: { calories: 380, protein: 22, carbs: 35, fat: 16, fiber: 2 },
    ingredients: [
      { name: 'Pork', quantity: 400, unit: 'g' },
      { name: 'Bell Pepper', quantity: 100, unit: 'g' },
      { name: 'Pineapple', quantity: 100, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cut pork into cubes, coat with cornstarch.' },
      { step: 2, instruction: 'Deep fry pork until crispy.' },
      { step: 3, instruction: 'Make sauce with ketchup, vinegar, sugar, and soy sauce.' },
      { step: 4, instruction: 'Stir-fry bell peppers and pineapple, add pork and sauce. Toss well.' },
    ],
    tags: ['crispy', 'tangy', 'classic'], imageEmoji: '🍍',
  },
  {
    id: 'r021', name: 'Chow Mein', cuisine: 'chinese', mealType: 'lunch', servings: 3,
    prepTimeMin: 10, cookTimeMin: 10, calories: 360, healthScore: 55,
    nutrition: { calories: 360, protein: 14, carbs: 45, fat: 14, fiber: 3 },
    ingredients: [
      { name: 'Egg Noodles', quantity: 300, unit: 'g' },
      { name: 'Chicken Breast', quantity: 150, unit: 'g' },
      { name: 'Cabbage', quantity: 100, unit: 'g' },
      { name: 'Soy Sauce', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cook noodles, drain and toss with sesame oil.' },
      { step: 2, instruction: 'Stir-fry sliced chicken with garlic.' },
      { step: 3, instruction: 'Add shredded cabbage, bean sprouts, and noodles.' },
      { step: 4, instruction: 'Season with soy sauce and oyster sauce, toss on high heat.' },
    ],
    tags: ['quick', 'stir-fry', 'filling'], imageEmoji: '🍝',
  },
  {
    id: 'r022', name: 'Dim Sum Har Gow', cuisine: 'chinese', mealType: 'snack', servings: 4,
    prepTimeMin: 30, cookTimeMin: 10, calories: 180, healthScore: 68,
    nutrition: { calories: 180, protein: 14, carbs: 22, fat: 4, fiber: 1 },
    ingredients: [
      { name: 'Shrimp', quantity: 300, unit: 'g' },
      { name: 'Bamboo Shoots', quantity: 50, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Chop shrimp coarsely, mix with sesame oil and white pepper.' },
      { step: 2, instruction: 'Make wheat starch dough, roll into thin wrappers.' },
      { step: 3, instruction: 'Wrap filling in dough, pleat edges.' },
      { step: 4, instruction: 'Steam for 8-10 minutes until translucent.' },
    ],
    tags: ['steamed', 'dim-sum', 'seafood'], imageEmoji: '🥟',
  },

  // ═══════════════════════════════════════
  // THAI RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r023', name: 'Pad Thai', cuisine: 'thai', mealType: 'lunch', servings: 3,
    prepTimeMin: 15, cookTimeMin: 10, calories: 400, healthScore: 58,
    nutrition: { calories: 400, protein: 18, carbs: 50, fat: 14, fiber: 3 },
    ingredients: [
      { name: 'Rice Noodles', quantity: 200, unit: 'g' },
      { name: 'Shrimp', quantity: 150, unit: 'g' },
      { name: 'Egg', quantity: 2, unit: 'piece' },
      { name: 'Peanuts', quantity: 30, unit: 'g' },
      { name: 'Bean Sprouts', quantity: 80, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Soak rice noodles in warm water until pliable.' },
      { step: 2, instruction: 'Stir-fry shrimp, push aside, scramble eggs in same wok.' },
      { step: 3, instruction: 'Add noodles, pad thai sauce (tamarind, fish sauce, sugar).' },
      { step: 4, instruction: 'Toss with bean sprouts, crushed peanuts, and lime juice.' },
    ],
    tags: ['street-food', 'popular', 'balanced'], imageEmoji: '🥡',
  },
  {
    id: 'r024', name: 'Green Curry with Chicken', cuisine: 'thai', mealType: 'dinner', servings: 4,
    prepTimeMin: 10, cookTimeMin: 20, calories: 350, healthScore: 62,
    nutrition: { calories: 350, protein: 24, carbs: 12, fat: 24, fiber: 3 },
    ingredients: [
      { name: 'Chicken Breast', quantity: 400, unit: 'g' },
      { name: 'Coconut (fresh)', quantity: 200, unit: 'g' },
      { name: 'Eggplant', quantity: 100, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Heat coconut cream, fry green curry paste until fragrant.' },
      { step: 2, instruction: 'Add sliced chicken and cook until white.' },
      { step: 3, instruction: 'Pour in coconut milk, add eggplant and bamboo shoots.' },
      { step: 4, instruction: 'Season with fish sauce, palm sugar, and Thai basil.' },
    ],
    tags: ['creamy', 'aromatic', 'spicy'], imageEmoji: '🟢',
  },
  {
    id: 'r025', name: 'Tom Yum Goong', cuisine: 'thai', mealType: 'dinner', servings: 4,
    prepTimeMin: 10, cookTimeMin: 15, calories: 120, healthScore: 82,
    nutrition: { calories: 120, protein: 14, carbs: 8, fat: 4, fiber: 1 },
    ingredients: [
      { name: 'Shrimp', quantity: 300, unit: 'g' },
      { name: 'Mushroom', quantity: 100, unit: 'g' },
      { name: 'Tomato', quantity: 80, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Boil water with lemongrass, galangal, and kaffir lime leaves.' },
      { step: 2, instruction: 'Add mushrooms and tomatoes.' },
      { step: 3, instruction: 'Add shrimp and cook until pink.' },
      { step: 4, instruction: 'Season with lime juice, fish sauce, and chili paste.' },
    ],
    tags: ['soup', 'low-calorie', 'immune-boost'], imageEmoji: '🍜',
  },
  {
    id: 'r026', name: 'Som Tam (Papaya Salad)', cuisine: 'thai', mealType: 'snack', servings: 2,
    prepTimeMin: 15, cookTimeMin: 0, calories: 80, healthScore: 90,
    nutrition: { calories: 80, protein: 2, carbs: 15, fat: 1, fiber: 4 },
    ingredients: [
      { name: 'Papaya', quantity: 200, unit: 'g' },
      { name: 'Tomato', quantity: 60, unit: 'g' },
      { name: 'Peanuts', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Shred green papaya into thin strips.' },
      { step: 2, instruction: 'Pound garlic and chilies in mortar.' },
      { step: 3, instruction: 'Add papaya, tomatoes, long beans, and peanuts.' },
      { step: 4, instruction: 'Season with lime juice, fish sauce, and palm sugar.' },
    ],
    tags: ['raw', 'refreshing', 'low-calorie'], imageEmoji: '🥗',
  },
  {
    id: 'r027', name: 'Mango Sticky Rice', cuisine: 'thai', mealType: 'snack', servings: 4,
    prepTimeMin: 20, cookTimeMin: 25, calories: 330, healthScore: 40,
    nutrition: { calories: 330, protein: 5, carbs: 64, fat: 7, fiber: 2 },
    ingredients: [
      { name: 'Sticky Rice', quantity: 200, unit: 'g' },
      { name: 'Mango', quantity: 200, unit: 'g' },
      { name: 'Coconut (fresh)', quantity: 80, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Soak sticky rice overnight, steam for 20 minutes.' },
      { step: 2, instruction: 'Mix warm rice with coconut cream, sugar, and salt.' },
      { step: 3, instruction: 'Slice ripe mango and arrange beside rice.' },
      { step: 4, instruction: 'Drizzle extra coconut cream and sesame seeds on top.' },
    ],
    tags: ['dessert', 'sweet', 'tropical'], imageEmoji: '🥭',
  },

  // ═══════════════════════════════════════
  // KOREAN RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r028', name: 'Bibimbap', cuisine: 'korean', mealType: 'lunch', servings: 2,
    prepTimeMin: 20, cookTimeMin: 15, calories: 480, healthScore: 72,
    nutrition: { calories: 480, protein: 22, carbs: 65, fat: 14, fiber: 6 },
    ingredients: [
      { name: 'White Rice', quantity: 300, unit: 'g' },
      { name: 'Beef', quantity: 100, unit: 'g' },
      { name: 'Spinach', quantity: 80, unit: 'g' },
      { name: 'Carrot', quantity: 60, unit: 'g' },
      { name: 'Egg', quantity: 2, unit: 'piece' },
    ],
    steps: [
      { step: 1, instruction: 'Prepare seasoned vegetables (spinach, carrots, mushrooms, zucchini).' },
      { step: 2, instruction: 'Cook seasoned beef strips.' },
      { step: 3, instruction: 'Arrange rice in bowl, top with vegetables, beef, and fried egg.' },
      { step: 4, instruction: 'Serve with gochujang sauce, mix everything before eating.' },
    ],
    tags: ['balanced', 'colorful', 'customizable'], imageEmoji: '🍚',
  },
  {
    id: 'r029', name: 'Bulgogi', cuisine: 'korean', mealType: 'dinner', servings: 4,
    prepTimeMin: 240, cookTimeMin: 10, calories: 320, healthScore: 65,
    nutrition: { calories: 320, protein: 34, carbs: 16, fat: 14, fiber: 1 },
    ingredients: [
      { name: 'Beef', quantity: 500, unit: 'g' },
      { name: 'Soy Sauce', quantity: 40, unit: 'g' },
      { name: 'Onion', quantity: 100, unit: 'g' },
      { name: 'Sesame Seeds', quantity: 10, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Thinly slice beef against the grain.' },
      { step: 2, instruction: 'Make marinade with soy sauce, sesame oil, pear juice, garlic, sugar.' },
      { step: 3, instruction: 'Marinate beef for at least 4 hours.' },
      { step: 4, instruction: 'Grill or pan-fry on high heat until caramelized.' },
    ],
    tags: ['bbq', 'marinated', 'popular'], imageEmoji: '🥓',
  },
  {
    id: 'r030', name: 'Kimchi Jjigae', cuisine: 'korean', mealType: 'dinner', servings: 3,
    prepTimeMin: 10, cookTimeMin: 25, calories: 240, healthScore: 70,
    nutrition: { calories: 240, protein: 18, carbs: 14, fat: 12, fiber: 4 },
    ingredients: [
      { name: 'Kimchi', quantity: 200, unit: 'g' },
      { name: 'Tofu', quantity: 200, unit: 'g' },
      { name: 'Pork', quantity: 100, unit: 'g' },
      { name: 'Onion', quantity: 60, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Sauté aged kimchi and sliced pork in sesame oil.' },
      { step: 2, instruction: 'Add water, gochugaru (chili flakes), and soy sauce.' },
      { step: 3, instruction: 'Bring to boil, add cubed tofu and sliced onion.' },
      { step: 4, instruction: 'Simmer for 15 minutes. Serve bubbling hot with rice.' },
    ],
    tags: ['stew', 'probiotic', 'comfort-food'], imageEmoji: '🫙',
  },
  {
    id: 'r031', name: 'Japchae', cuisine: 'korean', mealType: 'lunch', servings: 4,
    prepTimeMin: 15, cookTimeMin: 15, calories: 250, healthScore: 68,
    nutrition: { calories: 250, protein: 8, carbs: 38, fat: 8, fiber: 3 },
    ingredients: [
      { name: 'Glass Noodles', quantity: 200, unit: 'g' },
      { name: 'Spinach', quantity: 80, unit: 'g' },
      { name: 'Carrot', quantity: 60, unit: 'g' },
      { name: 'Bell Pepper', quantity: 60, unit: 'g' },
      { name: 'Beef', quantity: 80, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cook glass noodles, drain, and cut into manageable lengths.' },
      { step: 2, instruction: 'Stir-fry each vegetable separately with sesame oil.' },
      { step: 3, instruction: 'Cook marinated beef strips.' },
      { step: 4, instruction: 'Toss everything with soy sauce, sesame oil, and sesame seeds.' },
    ],
    tags: ['colorful', 'balanced', 'festive'], imageEmoji: '🫘',
  },
  {
    id: 'r032', name: 'Tteokbokki', cuisine: 'korean', mealType: 'snack', servings: 3,
    prepTimeMin: 5, cookTimeMin: 15, calories: 350, healthScore: 45,
    nutrition: { calories: 350, protein: 8, carbs: 65, fat: 6, fiber: 2 },
    ingredients: [
      { name: 'Tteokbokki', quantity: 400, unit: 'g' },
      { name: 'Gochujang', quantity: 40, unit: 'g' },
      { name: 'Egg', quantity: 2, unit: 'piece' },
    ],
    steps: [
      { step: 1, instruction: 'Soak rice cakes if frozen/dried.' },
      { step: 2, instruction: 'Make sauce with gochujang, sugar, soy sauce, and water.' },
      { step: 3, instruction: 'Boil sauce, add rice cakes and fish cake strips.' },
      { step: 4, instruction: 'Cook until sauce thickens, add boiled eggs.' },
    ],
    tags: ['street-food', 'spicy', 'chewy'], imageEmoji: '🔴',
  },
  {
    id: 'r033', name: 'Korean Fried Chicken', cuisine: 'korean', mealType: 'dinner', servings: 4,
    prepTimeMin: 15, cookTimeMin: 25, calories: 420, healthScore: 38,
    nutrition: { calories: 420, protein: 28, carbs: 22, fat: 26, fiber: 1 },
    ingredients: [
      { name: 'Chicken Thigh', quantity: 600, unit: 'g' },
      { name: 'Gochujang', quantity: 30, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cut chicken into pieces, coat with seasoned flour and cornstarch.' },
      { step: 2, instruction: 'Double fry: first at 160°C, then at 180°C for extra crispiness.' },
      { step: 3, instruction: 'Make yangnyeom sauce with gochujang, honey, garlic, and soy sauce.' },
      { step: 4, instruction: 'Toss fried chicken in sauce. Garnish with sesame seeds.' },
    ],
    tags: ['crispy', 'addictive', 'party'], imageEmoji: '🍗',
  },

  // ═══════════════════════════════════════
  // JAPANESE RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r034', name: 'Chicken Teriyaki', cuisine: 'japanese', mealType: 'dinner', servings: 3,
    prepTimeMin: 10, cookTimeMin: 15, calories: 340, healthScore: 65,
    nutrition: { calories: 340, protein: 32, carbs: 18, fat: 14, fiber: 0.5 },
    ingredients: [
      { name: 'Chicken Thigh', quantity: 400, unit: 'g' },
      { name: 'Soy Sauce', quantity: 40, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Score chicken thighs for even cooking.' },
      { step: 2, instruction: 'Pan-fry skin-side down until golden.' },
      { step: 3, instruction: 'Flip and add teriyaki sauce (soy, mirin, sake, sugar).' },
      { step: 4, instruction: 'Glaze chicken as sauce reduces. Slice and serve.' },
    ],
    tags: ['glazed', 'savory', 'popular'], imageEmoji: '✨',
  },
  {
    id: 'r035', name: 'Miso Soup', cuisine: 'japanese', mealType: 'breakfast', servings: 4,
    prepTimeMin: 5, cookTimeMin: 10, calories: 55, healthScore: 88,
    nutrition: { calories: 55, protein: 4, carbs: 6, fat: 2, fiber: 1 },
    ingredients: [
      { name: 'Tofu', quantity: 100, unit: 'g' },
      { name: 'Spinach', quantity: 40, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Heat dashi stock (or water with dashi powder).' },
      { step: 2, instruction: 'Add cubed tofu and wakame seaweed.' },
      { step: 3, instruction: 'Remove from heat, dissolve miso paste into soup.' },
      { step: 4, instruction: 'Garnish with sliced green onion.' },
    ],
    tags: ['light', 'probiotic', 'everyday'], imageEmoji: '🍵',
  },
  {
    id: 'r036', name: 'Sushi Rolls (Maki)', cuisine: 'japanese', mealType: 'lunch', servings: 2,
    prepTimeMin: 20, cookTimeMin: 15, calories: 300, healthScore: 72,
    nutrition: { calories: 300, protein: 12, carbs: 50, fat: 6, fiber: 3 },
    ingredients: [
      { name: 'White Rice', quantity: 300, unit: 'g' },
      { name: 'Tuna', quantity: 80, unit: 'g' },
      { name: 'Cucumber', quantity: 50, unit: 'g' },
      { name: 'Avocado', quantity: 50, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cook sushi rice, season with rice vinegar, sugar, salt.' },
      { step: 2, instruction: 'Place nori sheet on bamboo mat, spread rice evenly.' },
      { step: 3, instruction: 'Add filling (tuna, cucumber, avocado) in a line.' },
      { step: 4, instruction: 'Roll tightly, slice into 8 pieces. Serve with soy sauce and wasabi.' },
    ],
    tags: ['fresh', 'artistic', 'light'], imageEmoji: '🍣',
  },
  {
    id: 'r037', name: 'Tonkatsu', cuisine: 'japanese', mealType: 'dinner', servings: 2,
    prepTimeMin: 10, cookTimeMin: 10, calories: 480, healthScore: 42,
    nutrition: { calories: 480, protein: 30, carbs: 28, fat: 28, fiber: 2 },
    ingredients: [
      { name: 'Pork', quantity: 300, unit: 'g' },
      { name: 'Egg', quantity: 2, unit: 'piece' },
      { name: 'Cabbage', quantity: 100, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Pound pork loin to even thickness.' },
      { step: 2, instruction: 'Coat in flour, beaten egg, then panko breadcrumbs.' },
      { step: 3, instruction: 'Deep fry at 170°C until golden brown.' },
      { step: 4, instruction: 'Slice and serve with shredded cabbage and tonkatsu sauce.' },
    ],
    tags: ['crispy', 'hearty', 'comfort-food'], imageEmoji: '🥩',
  },
  {
    id: 'r038', name: 'Ramen', cuisine: 'japanese', mealType: 'dinner', servings: 2,
    prepTimeMin: 10, cookTimeMin: 15, calories: 450, healthScore: 55,
    nutrition: { calories: 450, protein: 22, carbs: 52, fat: 18, fiber: 2 },
    ingredients: [
      { name: 'Ramen Noodles', quantity: 200, unit: 'g' },
      { name: 'Egg', quantity: 2, unit: 'piece' },
      { name: 'Pork', quantity: 100, unit: 'g' },
      { name: 'Corn', quantity: 50, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Prepare broth (soy or miso based).' },
      { step: 2, instruction: 'Cook noodles according to package directions.' },
      { step: 3, instruction: 'Prepare toppings: soft-boiled egg, sliced pork (chashu), corn.' },
      { step: 4, instruction: 'Assemble: noodles in bowl, ladle broth, arrange toppings.' },
    ],
    tags: ['soup', 'warming', 'satisfying'], imageEmoji: '🍜',
  },
  {
    id: 'r039', name: 'Onigiri', cuisine: 'japanese', mealType: 'snack', servings: 4,
    prepTimeMin: 15, cookTimeMin: 15, calories: 170, healthScore: 65,
    nutrition: { calories: 170, protein: 5, carbs: 35, fat: 1.5, fiber: 1 },
    ingredients: [
      { name: 'White Rice', quantity: 400, unit: 'g' },
      { name: 'Salmon', quantity: 80, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cook short-grain rice and let cool slightly.' },
      { step: 2, instruction: 'Flake cooked salmon (or use canned tuna with mayo).' },
      { step: 3, instruction: 'Wet hands with salted water, shape rice into triangles with filling.' },
      { step: 4, instruction: 'Wrap with nori strip.' },
    ],
    tags: ['portable', 'simple', 'bento'], imageEmoji: '🍙',
  },

  // ═══════════════════════════════════════
  // WESTERN RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r040', name: 'Grilled Chicken Salad', cuisine: 'western', mealType: 'lunch', servings: 2,
    prepTimeMin: 10, cookTimeMin: 15, calories: 320, healthScore: 88,
    nutrition: { calories: 320, protein: 35, carbs: 12, fat: 15, fiber: 5 },
    ingredients: [
      { name: 'Chicken Breast', quantity: 250, unit: 'g' },
      { name: 'Spinach', quantity: 100, unit: 'g' },
      { name: 'Tomato', quantity: 100, unit: 'g' },
      { name: 'Avocado', quantity: 75, unit: 'g' },
      { name: 'Olive Oil', quantity: 15, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Season chicken with herbs, grill until cooked.' },
      { step: 2, instruction: 'Arrange spinach, cherry tomatoes, and sliced avocado in bowl.' },
      { step: 3, instruction: 'Slice chicken and place on salad.' },
      { step: 4, instruction: 'Drizzle with olive oil and balsamic vinegar dressing.' },
    ],
    tags: ['healthy', 'high-protein', 'low-carb'], imageEmoji: '🥗',
  },
  {
    id: 'r041', name: 'Overnight Oats', cuisine: 'western', mealType: 'breakfast', servings: 1,
    prepTimeMin: 5, cookTimeMin: 0, calories: 350, healthScore: 85,
    nutrition: { calories: 350, protein: 14, carbs: 48, fat: 12, fiber: 8 },
    ingredients: [
      { name: 'Oats', quantity: 50, unit: 'g' },
      { name: 'Milk', quantity: 200, unit: 'ml' },
      { name: 'Banana', quantity: 1, unit: 'piece' },
      { name: 'Chia Seeds', quantity: 10, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Mix oats, milk, chia seeds, and honey in a jar.' },
      { step: 2, instruction: 'Cover and refrigerate overnight.' },
      { step: 3, instruction: 'Top with sliced banana and berries in the morning.' },
    ],
    tags: ['meal-prep', 'no-cook', 'fiber-rich'], imageEmoji: '🫙',
  },
  {
    id: 'r042', name: 'Avocado Toast', cuisine: 'western', mealType: 'breakfast', servings: 1,
    prepTimeMin: 5, cookTimeMin: 3, calories: 280, healthScore: 78,
    nutrition: { calories: 280, protein: 10, carbs: 24, fat: 18, fiber: 8 },
    ingredients: [
      { name: 'Whole Wheat Bread', quantity: 2, unit: 'slice' },
      { name: 'Avocado', quantity: 1, unit: 'piece' },
      { name: 'Egg', quantity: 1, unit: 'piece' },
    ],
    steps: [
      { step: 1, instruction: 'Toast bread slices until golden.' },
      { step: 2, instruction: 'Mash avocado with salt, pepper, and lemon juice.' },
      { step: 3, instruction: 'Spread avocado on toast, top with poached or fried egg.' },
    ],
    tags: ['trendy', 'healthy-fats', 'quick'], imageEmoji: '🥑',
  },
  {
    id: 'r043', name: 'Spaghetti Bolognese', cuisine: 'western', mealType: 'dinner', servings: 4,
    prepTimeMin: 10, cookTimeMin: 40, calories: 480, healthScore: 55,
    nutrition: { calories: 480, protein: 24, carbs: 55, fat: 18, fiber: 4 },
    ingredients: [
      { name: 'Spaghetti', quantity: 400, unit: 'g' },
      { name: 'Ground Beef', quantity: 300, unit: 'g' },
      { name: 'Tomato', quantity: 300, unit: 'g' },
      { name: 'Onion', quantity: 100, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Brown ground beef with diced onion and garlic.' },
      { step: 2, instruction: 'Add crushed tomatoes, tomato paste, and Italian herbs.' },
      { step: 3, instruction: 'Simmer sauce for 30 minutes.' },
      { step: 4, instruction: 'Cook spaghetti al dente, serve with sauce and parmesan.' },
    ],
    tags: ['classic', 'hearty', 'family'], imageEmoji: '🍝',
  },
  {
    id: 'r044', name: 'Greek Yogurt Bowl', cuisine: 'western', mealType: 'breakfast', servings: 1,
    prepTimeMin: 5, cookTimeMin: 0, calories: 280, healthScore: 90,
    nutrition: { calories: 280, protein: 22, carbs: 30, fat: 8, fiber: 5 },
    ingredients: [
      { name: 'Greek Yogurt', quantity: 200, unit: 'g' },
      { name: 'Granola', quantity: 30, unit: 'g' },
      { name: 'Strawberry', quantity: 80, unit: 'g' },
      { name: 'Honey', quantity: 10, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Spoon Greek yogurt into a bowl.' },
      { step: 2, instruction: 'Top with granola and sliced strawberries.' },
      { step: 3, instruction: 'Drizzle with honey.' },
    ],
    tags: ['probiotic', 'high-protein', 'quick'], imageEmoji: '🫐',
  },

  // ═══════════════════════════════════════
  // MEDITERRANEAN RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r045', name: 'Falafel Wrap', cuisine: 'mediterranean', mealType: 'lunch', servings: 2,
    prepTimeMin: 15, cookTimeMin: 15, calories: 380, healthScore: 75,
    nutrition: { calories: 380, protein: 14, carbs: 42, fat: 18, fiber: 8 },
    ingredients: [
      { name: 'Falafel', quantity: 8, unit: 'piece' },
      { name: 'Pita Bread', quantity: 2, unit: 'piece' },
      { name: 'Hummus', quantity: 60, unit: 'g' },
      { name: 'Tomato', quantity: 80, unit: 'g' },
      { name: 'Cucumber', quantity: 60, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Make or heat falafel until crispy.' },
      { step: 2, instruction: 'Warm pita bread and spread with hummus.' },
      { step: 3, instruction: 'Add falafel, diced tomatoes, cucumber, and pickled vegetables.' },
      { step: 4, instruction: 'Drizzle with tahini sauce and wrap.' },
    ],
    tags: ['vegan', 'fiber-rich', 'filling'], imageEmoji: '🧆',
  },
  {
    id: 'r046', name: 'Hummus with Pita', cuisine: 'mediterranean', mealType: 'snack', servings: 4,
    prepTimeMin: 10, cookTimeMin: 0, calories: 220, healthScore: 78,
    nutrition: { calories: 220, protein: 8, carbs: 28, fat: 9, fiber: 5 },
    ingredients: [
      { name: 'Chickpeas', quantity: 200, unit: 'g' },
      { name: 'Tahini', quantity: 30, unit: 'g' },
      { name: 'Pita Bread', quantity: 2, unit: 'piece' },
      { name: 'Olive Oil', quantity: 10, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Blend chickpeas, tahini, lemon juice, garlic, and olive oil.' },
      { step: 2, instruction: 'Add ice water gradually for smooth texture.' },
      { step: 3, instruction: 'Serve with warm pita bread and olive oil drizzle.' },
    ],
    tags: ['vegan', 'dip', 'healthy-fats'], imageEmoji: '🫓',
  },

  // ═══════════════════════════════════════
  // MEXICAN RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r047', name: 'Chicken Tacos', cuisine: 'mexican', mealType: 'dinner', servings: 3,
    prepTimeMin: 15, cookTimeMin: 15, calories: 380, healthScore: 65,
    nutrition: { calories: 380, protein: 24, carbs: 32, fat: 18, fiber: 4 },
    ingredients: [
      { name: 'Chicken Breast', quantity: 300, unit: 'g' },
      { name: 'Tortilla (Flour)', quantity: 6, unit: 'piece' },
      { name: 'Tomato', quantity: 100, unit: 'g' },
      { name: 'Avocado', quantity: 75, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Season chicken with cumin, chili powder, and lime.' },
      { step: 2, instruction: 'Grill or pan-sear chicken, then slice.' },
      { step: 3, instruction: 'Warm tortillas, fill with chicken, salsa, and guacamole.' },
      { step: 4, instruction: 'Top with cilantro, onion, and lime juice.' },
    ],
    tags: ['fun', 'customizable', 'party'], imageEmoji: '🌮',
  },
  {
    id: 'r048', name: 'Burrito Bowl', cuisine: 'mexican', mealType: 'lunch', servings: 2,
    prepTimeMin: 15, cookTimeMin: 20, calories: 520, healthScore: 70,
    nutrition: { calories: 520, protein: 28, carbs: 58, fat: 18, fiber: 10 },
    ingredients: [
      { name: 'White Rice', quantity: 200, unit: 'g' },
      { name: 'Kidney Beans', quantity: 150, unit: 'g' },
      { name: 'Chicken Breast', quantity: 200, unit: 'g' },
      { name: 'Corn', quantity: 80, unit: 'g' },
      { name: 'Avocado', quantity: 75, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cook rice with lime juice and cilantro.' },
      { step: 2, instruction: 'Season and grill chicken, slice.' },
      { step: 3, instruction: 'Arrange rice, beans, corn, chicken in bowl.' },
      { step: 4, instruction: 'Top with guacamole, salsa, and sour cream.' },
    ],
    tags: ['balanced', 'filling', 'meal-prep'], imageEmoji: '🥙',
  },
  {
    id: 'r049', name: 'Guacamole', cuisine: 'mexican', mealType: 'snack', servings: 4,
    prepTimeMin: 10, cookTimeMin: 0, calories: 160, healthScore: 82,
    nutrition: { calories: 160, protein: 2, carbs: 9, fat: 14, fiber: 7 },
    ingredients: [
      { name: 'Avocado', quantity: 2, unit: 'piece' },
      { name: 'Tomato', quantity: 60, unit: 'g' },
      { name: 'Onion', quantity: 30, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Halve and pit avocados, scoop into bowl.' },
      { step: 2, instruction: 'Mash to desired consistency.' },
      { step: 3, instruction: 'Mix in diced tomato, onion, cilantro, lime juice, and salt.' },
    ],
    tags: ['raw', 'healthy-fats', 'dip'], imageEmoji: '🥑',
  },

  // ═══════════════════════════════════════
  // GLOBAL / MIXED RECIPES
  // ═══════════════════════════════════════
  {
    id: 'r050', name: 'Scrambled Eggs on Toast', cuisine: 'global', mealType: 'breakfast', servings: 1,
    prepTimeMin: 3, cookTimeMin: 5, calories: 320, healthScore: 68,
    nutrition: { calories: 320, protein: 18, carbs: 26, fat: 16, fiber: 2 },
    ingredients: [
      { name: 'Egg', quantity: 2, unit: 'piece' },
      { name: 'White Bread', quantity: 2, unit: 'slice' },
      { name: 'Butter', quantity: 10, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Beat eggs with a pinch of salt and pepper.' },
      { step: 2, instruction: 'Melt butter in pan, cook eggs on low heat, stirring gently.' },
      { step: 3, instruction: 'Toast bread, serve eggs on top.' },
    ],
    tags: ['quick', 'classic', 'protein'], imageEmoji: '🍳',
  },
  {
    id: 'r051', name: 'Banana Smoothie', cuisine: 'global', mealType: 'breakfast', servings: 1,
    prepTimeMin: 5, cookTimeMin: 0, calories: 220, healthScore: 78,
    nutrition: { calories: 220, protein: 8, carbs: 38, fat: 4, fiber: 3 },
    ingredients: [
      { name: 'Banana', quantity: 1, unit: 'piece' },
      { name: 'Milk', quantity: 200, unit: 'ml' },
      { name: 'Honey', quantity: 10, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Peel banana and cut into chunks.' },
      { step: 2, instruction: 'Blend banana, milk, honey, and ice until smooth.' },
    ],
    tags: ['quick', 'refreshing', 'energy-boost'], imageEmoji: '🍌',
  },
  {
    id: 'r052', name: 'Chicken Soup', cuisine: 'global', mealType: 'dinner', servings: 4,
    prepTimeMin: 10, cookTimeMin: 30, calories: 180, healthScore: 82,
    nutrition: { calories: 180, protein: 18, carbs: 12, fat: 6, fiber: 2 },
    ingredients: [
      { name: 'Chicken Breast', quantity: 300, unit: 'g' },
      { name: 'Carrot', quantity: 100, unit: 'g' },
      { name: 'Potato', quantity: 150, unit: 'g' },
      { name: 'Onion', quantity: 80, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Boil chicken with onion, garlic, and bay leaf. Shred chicken.' },
      { step: 2, instruction: 'Add diced carrots and potatoes to broth.' },
      { step: 3, instruction: 'Cook until vegetables are tender, return chicken.' },
      { step: 4, instruction: 'Season with salt, pepper, and fresh herbs.' },
    ],
    tags: ['healing', 'comfort-food', 'light'], imageEmoji: '🍲',
  },
  {
    id: 'r053', name: 'Fruit Salad', cuisine: 'global', mealType: 'snack', servings: 3,
    prepTimeMin: 10, cookTimeMin: 0, calories: 120, healthScore: 95,
    nutrition: { calories: 120, protein: 2, carbs: 28, fat: 0.5, fiber: 4 },
    ingredients: [
      { name: 'Banana', quantity: 1, unit: 'piece' },
      { name: 'Apple', quantity: 1, unit: 'piece' },
      { name: 'Orange', quantity: 1, unit: 'piece' },
      { name: 'Grapes', quantity: 80, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Wash and chop all fruits into bite-sized pieces.' },
      { step: 2, instruction: 'Mix in a bowl with a squeeze of lime juice.' },
      { step: 3, instruction: 'Optional: drizzle with honey or chaat masala.' },
    ],
    tags: ['raw', 'vitamin-rich', 'refreshing'], imageEmoji: '🍎',
  },
  {
    id: 'r054', name: 'Vegetable Stir-Fry', cuisine: 'global', mealType: 'lunch', servings: 2,
    prepTimeMin: 10, cookTimeMin: 10, calories: 180, healthScore: 88,
    nutrition: { calories: 180, protein: 6, carbs: 18, fat: 10, fiber: 5 },
    ingredients: [
      { name: 'Broccoli', quantity: 100, unit: 'g' },
      { name: 'Bell Pepper', quantity: 80, unit: 'g' },
      { name: 'Carrot', quantity: 60, unit: 'g' },
      { name: 'Mushroom', quantity: 60, unit: 'g' },
      { name: 'Soy Sauce', quantity: 15, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cut all vegetables into uniform pieces.' },
      { step: 2, instruction: 'Heat oil in wok on high heat.' },
      { step: 3, instruction: 'Stir-fry vegetables in order of cook time (carrots first).' },
      { step: 4, instruction: 'Season with soy sauce, garlic, and sesame oil.' },
    ],
    tags: ['healthy', 'quick', 'colorful'], imageEmoji: '🥦',
  },
  {
    id: 'r055', name: 'Lentil Soup', cuisine: 'global', mealType: 'dinner', servings: 4,
    prepTimeMin: 10, cookTimeMin: 30, calories: 220, healthScore: 85,
    nutrition: { calories: 220, protein: 14, carbs: 35, fat: 3, fiber: 10 },
    ingredients: [
      { name: 'Red Lentils', quantity: 200, unit: 'g' },
      { name: 'Carrot', quantity: 100, unit: 'g' },
      { name: 'Onion', quantity: 80, unit: 'g' },
      { name: 'Tomato', quantity: 100, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Sauté onions and garlic until translucent.' },
      { step: 2, instruction: 'Add diced carrots and cook for 3 minutes.' },
      { step: 3, instruction: 'Add lentils, tomatoes, and broth. Bring to boil.' },
      { step: 4, instruction: 'Simmer for 25 minutes until lentils are soft. Season and blend partially.' },
    ],
    tags: ['vegan', 'high-fiber', 'warming'], imageEmoji: '🫕',
  },
  {
    id: 'r056', name: 'Peanut Butter Banana Toast', cuisine: 'global', mealType: 'breakfast', servings: 1,
    prepTimeMin: 3, cookTimeMin: 2, calories: 310, healthScore: 72,
    nutrition: { calories: 310, protein: 12, carbs: 35, fat: 15, fiber: 5 },
    ingredients: [
      { name: 'Whole Wheat Bread', quantity: 2, unit: 'slice' },
      { name: 'Peanut Butter', quantity: 30, unit: 'g' },
      { name: 'Banana', quantity: 1, unit: 'piece' },
    ],
    steps: [
      { step: 1, instruction: 'Toast bread until golden.' },
      { step: 2, instruction: 'Spread peanut butter on toast.' },
      { step: 3, instruction: 'Top with sliced banana and a drizzle of honey.' },
    ],
    tags: ['quick', 'energy', 'kid-friendly'], imageEmoji: '🥜',
  },
  {
    id: 'r057', name: 'Quinoa Buddha Bowl', cuisine: 'global', mealType: 'lunch', servings: 2,
    prepTimeMin: 10, cookTimeMin: 20, calories: 420, healthScore: 92,
    nutrition: { calories: 420, protein: 16, carbs: 52, fat: 18, fiber: 10 },
    ingredients: [
      { name: 'Quinoa', quantity: 150, unit: 'g' },
      { name: 'Sweet Potato', quantity: 150, unit: 'g' },
      { name: 'Chickpeas', quantity: 100, unit: 'g' },
      { name: 'Spinach', quantity: 60, unit: 'g' },
      { name: 'Avocado', quantity: 75, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cook quinoa and roast cubed sweet potato with cumin.' },
      { step: 2, instruction: 'Season chickpeas with paprika and bake until crispy.' },
      { step: 3, instruction: 'Arrange quinoa, sweet potato, chickpeas, spinach, and avocado in bowl.' },
      { step: 4, instruction: 'Drizzle with tahini dressing.' },
    ],
    tags: ['superfood', 'vegan', 'instagram-worthy'], imageEmoji: '🧘',
  },
  {
    id: 'r058', name: 'Egg Curry', cuisine: 'bangladeshi', mealType: 'lunch', servings: 4,
    prepTimeMin: 10, cookTimeMin: 20, calories: 240, healthScore: 65,
    nutrition: { calories: 240, protein: 14, carbs: 10, fat: 16, fiber: 2 },
    ingredients: [
      { name: 'Egg', quantity: 6, unit: 'piece' },
      { name: 'Onion', quantity: 100, unit: 'g' },
      { name: 'Tomato', quantity: 80, unit: 'g' },
      { name: 'Potato', quantity: 150, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Hard boil eggs, peel and lightly fry until golden.' },
      { step: 2, instruction: 'Make onion-tomato masala with turmeric and cumin.' },
      { step: 3, instruction: 'Add diced potatoes and cook until tender.' },
      { step: 4, instruction: 'Add eggs, simmer for 5 minutes. Garnish with coriander.' },
    ],
    tags: ['budget-friendly', 'protein', 'everyday'], imageEmoji: '🥚',
  },
  {
    id: 'r059', name: 'Satay Chicken Skewers', cuisine: 'thai', mealType: 'snack', servings: 4,
    prepTimeMin: 60, cookTimeMin: 12, calories: 280, healthScore: 65,
    nutrition: { calories: 280, protein: 28, carbs: 10, fat: 15, fiber: 1 },
    ingredients: [
      { name: 'Chicken Breast', quantity: 400, unit: 'g' },
      { name: 'Peanut Butter', quantity: 30, unit: 'g' },
      { name: 'Coconut (fresh)', quantity: 50, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Cut chicken into strips, marinate with turmeric, cumin, and coconut milk.' },
      { step: 2, instruction: 'Thread onto skewers, grill for 6 minutes each side.' },
      { step: 3, instruction: 'Make peanut sauce: blend peanut butter, coconut milk, chili, and lime.' },
      { step: 4, instruction: 'Serve skewers with peanut dipping sauce.' },
    ],
    tags: ['grilled', 'party', 'protein'], imageEmoji: '🍢',
  },
  {
    id: 'r060', name: 'Kimbap', cuisine: 'korean', mealType: 'lunch', servings: 2,
    prepTimeMin: 20, cookTimeMin: 10, calories: 320, healthScore: 70,
    nutrition: { calories: 320, protein: 12, carbs: 48, fat: 8, fiber: 2 },
    ingredients: [
      { name: 'White Rice', quantity: 300, unit: 'g' },
      { name: 'Carrot', quantity: 50, unit: 'g' },
      { name: 'Spinach', quantity: 50, unit: 'g' },
      { name: 'Egg', quantity: 2, unit: 'piece' },
      { name: 'Beef', quantity: 60, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Season rice with sesame oil and salt.' },
      { step: 2, instruction: 'Prepare fillings: julienned carrots, blanched spinach, egg strips, seasoned beef.' },
      { step: 3, instruction: 'Spread rice on seaweed, arrange fillings, and roll tightly.' },
      { step: 4, instruction: 'Slice into rounds, brush with sesame oil.' },
    ],
    tags: ['portable', 'balanced', 'picnic'], imageEmoji: '🫒',
  },
  {
    id: 'r061', name: 'Chicken Shawarma', cuisine: 'mediterranean', mealType: 'dinner', servings: 4,
    prepTimeMin: 120, cookTimeMin: 20, calories: 420, healthScore: 65,
    nutrition: { calories: 420, protein: 32, carbs: 30, fat: 20, fiber: 3 },
    ingredients: [
      { name: 'Chicken Thigh', quantity: 500, unit: 'g' },
      { name: 'Pita Bread', quantity: 4, unit: 'piece' },
      { name: 'Yogurt', quantity: 80, unit: 'g' },
      { name: 'Tomato', quantity: 100, unit: 'g' },
      { name: 'Onion', quantity: 60, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Marinate chicken with shawarma spices and yogurt for 2 hours.' },
      { step: 2, instruction: 'Grill or roast chicken until charred edges.' },
      { step: 3, instruction: 'Slice thinly, warm pita bread.' },
      { step: 4, instruction: 'Assemble with pickled onions, tomato, and garlic sauce.' },
    ],
    tags: ['marinated', 'middle-eastern', 'filling'], imageEmoji: '🥙',
  },
  {
    id: 'r062', name: 'Quesadilla', cuisine: 'mexican', mealType: 'snack', servings: 2,
    prepTimeMin: 5, cookTimeMin: 8, calories: 400, healthScore: 50,
    nutrition: { calories: 400, protein: 20, carbs: 30, fat: 22, fiber: 2 },
    ingredients: [
      { name: 'Tortilla (Flour)', quantity: 2, unit: 'piece' },
      { name: 'Mozzarella', quantity: 100, unit: 'g' },
      { name: 'Chicken Breast', quantity: 100, unit: 'g' },
      { name: 'Bell Pepper', quantity: 50, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Shred cooked chicken, slice bell peppers.' },
      { step: 2, instruction: 'Fill tortilla with cheese, chicken, and peppers.' },
      { step: 3, instruction: 'Fold and cook in pan until golden on both sides.' },
      { step: 4, instruction: 'Cut into wedges, serve with salsa and sour cream.' },
    ],
    tags: ['quick', 'cheesy', 'kid-friendly'], imageEmoji: '🧀',
  },
  {
    id: 'r063', name: 'Egg Bhurji', cuisine: 'indian', mealType: 'breakfast', servings: 2,
    prepTimeMin: 5, cookTimeMin: 8, calories: 220, healthScore: 68,
    nutrition: { calories: 220, protein: 14, carbs: 6, fat: 16, fiber: 1 },
    ingredients: [
      { name: 'Egg', quantity: 4, unit: 'piece' },
      { name: 'Onion', quantity: 60, unit: 'g' },
      { name: 'Tomato', quantity: 60, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Sauté onions, green chilies, and tomatoes.' },
      { step: 2, instruction: 'Add turmeric and cumin powder.' },
      { step: 3, instruction: 'Crack eggs in and scramble with vegetables.' },
      { step: 4, instruction: 'Garnish with fresh coriander. Serve with roti or bread.' },
    ],
    tags: ['spiced', 'quick', 'protein'], imageEmoji: '🍳',
  },
  {
    id: 'r064', name: 'Idli Sambar', cuisine: 'indian', mealType: 'breakfast', servings: 2,
    prepTimeMin: 10, cookTimeMin: 20, calories: 240, healthScore: 80,
    nutrition: { calories: 240, protein: 10, carbs: 42, fat: 3, fiber: 5 },
    ingredients: [
      { name: 'Idli', quantity: 4, unit: 'piece' },
      { name: 'Pigeon Peas', quantity: 100, unit: 'g' },
      { name: 'Carrot', quantity: 50, unit: 'g' },
      { name: 'Onion', quantity: 40, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Steam idli batter in molds until fluffy.' },
      { step: 2, instruction: 'Cook toor dal, prepare sambar with vegetables and tamarind.' },
      { step: 3, instruction: 'Serve idlis with hot sambar and coconut chutney.' },
    ],
    tags: ['south-indian', 'steamed', 'healthy'], imageEmoji: '⚪',
  },
  {
    id: 'r065', name: 'Chicken Fried Rice (Bangladeshi Style)', cuisine: 'bangladeshi', mealType: 'dinner', servings: 3,
    prepTimeMin: 10, cookTimeMin: 15, calories: 420, healthScore: 52,
    nutrition: { calories: 420, protein: 18, carbs: 52, fat: 16, fiber: 2 },
    ingredients: [
      { name: 'White Rice', quantity: 400, unit: 'g' },
      { name: 'Chicken Breast', quantity: 150, unit: 'g' },
      { name: 'Egg', quantity: 2, unit: 'piece' },
      { name: 'Onion', quantity: 60, unit: 'g' },
      { name: 'Soy Sauce', quantity: 20, unit: 'g' },
    ],
    steps: [
      { step: 1, instruction: 'Use day-old rice for best texture.' },
      { step: 2, instruction: 'Stir-fry diced chicken until golden, set aside.' },
      { step: 3, instruction: 'Scramble eggs, add rice, chicken, and vegetables.' },
      { step: 4, instruction: 'Season with soy sauce and serve with chili sauce.' },
    ],
    tags: ['popular', 'quick', 'filling'], imageEmoji: '🍚',
  },
];
