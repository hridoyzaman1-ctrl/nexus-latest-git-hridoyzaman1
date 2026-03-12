import type { Recipe, CuisineType, MealType, Ingredient } from '@/types/nutrition';
import { RECIPE_DATABASE } from './recipeDatabase';
import { getCustomRecipes } from './storage';

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function getAllRecipes(): Recipe[] {
  return [...RECIPE_DATABASE, ...getCustomRecipes()];
}

export interface RecipeMatch {
  recipe: Recipe;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  isCustom: boolean;
}

export function findRecipesByIngredients(
  userIngredients: Ingredient[],
  options?: { cuisine?: CuisineType; mealType?: MealType; minMatch?: number }
): RecipeMatch[] {
  const userNames = new Set(userIngredients.map(i => normalize(i.name)));
  const customIds = new Set(getCustomRecipes().map(r => r.id));
  let recipes = getAllRecipes();
  if (options?.cuisine && options.cuisine !== 'global') {
    recipes = recipes.filter(r => r.cuisine === options.cuisine);
  }
  if (options?.mealType) {
    recipes = recipes.filter(r => r.mealType === options.mealType);
  }
  const matches: RecipeMatch[] = recipes.map(recipe => {
    const matched: string[] = [];
    const missing: string[] = [];
    recipe.ingredients.forEach(ri => {
      const riNorm = normalize(ri.name);
      const found = Array.from(userNames).some(un =>
        un.includes(riNorm) || riNorm.includes(un)
      );
      if (found) matched.push(ri.name);
      else missing.push(ri.name);
    });
    return {
      recipe,
      matchedIngredients: matched,
      missingIngredients: missing,
      matchPercentage: recipe.ingredients.length > 0
        ? Math.round((matched.length / recipe.ingredients.length) * 100)
        : 0,
      isCustom: customIds.has(recipe.id),
    };
  });
  const minMatch = options?.minMatch ?? 0;
  return matches
    .filter(m => m.matchPercentage >= minMatch)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

export function browseRecipes(options?: {
  cuisine?: CuisineType;
  mealType?: MealType;
  search?: string;
  minHealthScore?: number;
}): Recipe[] {
  let recipes = getAllRecipes();
  if (options?.cuisine && options.cuisine !== 'global') {
    recipes = recipes.filter(r => r.cuisine === options.cuisine);
  }
  if (options?.mealType) {
    recipes = recipes.filter(r => r.mealType === options.mealType);
  }
  if (options?.minHealthScore) {
    recipes = recipes.filter(r => r.healthScore >= options.minHealthScore);
  }
  if (options?.search) {
    const q = normalize(options.search);
    recipes = recipes.filter(r =>
      normalize(r.name).includes(q) ||
      r.tags.some(t => normalize(t).includes(q))
    );
  }
  return recipes;
}

export function getRecipeById(id: string): Recipe | undefined {
  return getAllRecipes().find(r => r.id === id);
}
