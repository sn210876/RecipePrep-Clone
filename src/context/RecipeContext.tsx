import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Recipe, MealPlanEntry, GroceryListItem, UserPreferences } from '../types/recipe';
import { buildUserProfile, UserProfile, trackRecipeInteraction, updateUserPreferenceAnalytics } from '../services/recommendationService';
import { getSavedRecipes, saveRecipeToCloud, removeRecipeFromCloud } from '../services/recipeService';
import { useAuth } from './AuthContext';

interface RecipeState {
  savedRecipes: Recipe[];
  mealPlan: MealPlanEntry[];
  groceryList: GroceryListItem[];
  userPreferences: UserPreferences;
  userProfile: UserProfile;
  discoveryRecipes: Recipe[];
  hasSeenOnboarding: boolean;
}

type RecipeAction =
  | { type: 'SAVE_RECIPE'; payload: Recipe }
  | { type: 'REMOVE_RECIPE'; payload: string }
  | { type: 'ADD_MEAL_PLAN'; payload: MealPlanEntry }
  | { type: 'REMOVE_MEAL_PLAN'; payload: string }
  | { type: 'CLEAR_MEAL_PLAN' }
  | { type: 'UPDATE_MEAL_PLAN'; payload: MealPlanEntry }
  | { type: 'ADD_GROCERY_ITEM'; payload: GroceryListItem }
  | { type: 'REMOVE_GROCERY_ITEM'; payload: string }
  | { type: 'TOGGLE_GROCERY_ITEM'; payload: string }
  | { type: 'UPDATE_GROCERY_LIST'; payload: GroceryListItem[] }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'LOAD_STATE'; payload: RecipeState }
  | { type: 'SET_SAVED_RECIPES'; payload: Recipe[] };

const initialState: RecipeState = {
  savedRecipes: [],
  mealPlan: [],
  groceryList: [],
  userPreferences: {
    dietaryPreferences: [],
    favoriteCuisines: [],
    cookingSkillLevel: 'Beginner',
    householdSize: 2,
    dislikedIngredients: [],
    visualLearningStyle: 'auto'
  },
  userProfile: {
    cuisinePreferences: {},
    dietaryPreferences: [],
    difficultyPreferences: {},
    avgCookTime: 0,
    totalRecipesSaved: 0
  },
  discoveryRecipes: [],
  hasSeenOnboarding: true
};

interface RecipeContextValue {
  state: RecipeState;
  dispatch: React.Dispatch<RecipeAction>;
  syncRecipesFromCloud: () => Promise<void>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  removeRecipe: (recipeId: string) => Promise<void>;
}

const RecipeContext = createContext<RecipeContextValue | undefined>(undefined);

function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case 'SAVE_RECIPE': {
      const exists = state.savedRecipes.some(r => r.id === action.payload.id);
      if (exists) return state;

      const updatedSavedRecipes = [...state.savedRecipes, { ...action.payload, isSaved: true }];
      const updatedProfile = buildUserProfile(updatedSavedRecipes);

      trackRecipeInteraction();
      updateUserPreferenceAnalytics();

      return {
        ...state,
        savedRecipes: updatedSavedRecipes,
        userProfile: updatedProfile
      };
    }
    case 'REMOVE_RECIPE': {
      const updatedSavedRecipes = state.savedRecipes.filter(r => r.id !== action.payload);
      const updatedProfile = buildUserProfile(updatedSavedRecipes);

      trackRecipeInteraction();
      updateUserPreferenceAnalytics();

      return {
        ...state,
        savedRecipes: updatedSavedRecipes,
        userProfile: updatedProfile
      };
    }
    case 'ADD_MEAL_PLAN':
      return {
        ...state,
        mealPlan: [...state.mealPlan, action.payload]
      };
    case 'REMOVE_MEAL_PLAN':
      return {
        ...state,
        mealPlan: state.mealPlan.filter(m => m.id !== action.payload)
      };
    case 'CLEAR_MEAL_PLAN':
      return {
        ...state,
        mealPlan: [],
        groceryList: []
      };
    case 'UPDATE_MEAL_PLAN':
      return {
        ...state,
        mealPlan: state.mealPlan.map(m => m.id === action.payload.id ? action.payload : m)
      };
    case 'ADD_GROCERY_ITEM':
      return {
        ...state,
        groceryList: [...state.groceryList, action.payload]
      };
    case 'REMOVE_GROCERY_ITEM':
      return {
        ...state,
       groceryList: state.groceryList.filter(i => i.id !== action.payload)
      };
    case 'TOGGLE_GROCERY_ITEM':
      return {
        ...state,
        groceryList: state.groceryList.map(i =>
          i.id === action.payload ? { ...i, checked: !i.checked } : i
        )
      };
    case 'UPDATE_GROCERY_LIST':
      return {
        ...state,
        groceryList: action.payload
      };
    case 'UPDATE_PREFERENCES': {
      const updatedPreferences = { ...state.userPreferences, ...action.payload };
      return {
        ...state,
        userPreferences: updatedPreferences
      };
    }
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        hasSeenOnboarding: true
      };
    case 'LOAD_STATE': {
      const loadedState = action.payload;
      const profile = buildUserProfile(loadedState.savedRecipes || []);
      return {
        ...loadedState,
        userProfile: profile
      };
    }
    case 'SET_SAVED_RECIPES': {
      const profile = buildUserProfile(action.payload);
      return {
        ...state,
        savedRecipes: action.payload,
        userProfile: profile
      };
    }
    default:
      return state;
  }
}

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(recipeReducer, initialState);
  const auth = useAuth();

  const syncRecipesFromCloud = async () => {
    if (!auth?.user) return;

    try {
      const cloudRecipes = await getSavedRecipes(auth.user.id);
      dispatch({ type: 'SET_SAVED_RECIPES', payload: cloudRecipes });
    } catch (error) {
      console.error('Failed to sync recipes from cloud:', error);
    }
  };

  const saveRecipe = async (recipe: Recipe) => {
    dispatch({ type: 'SAVE_RECIPE', payload: recipe });

    if (auth?.user) {
      try {
        console.log('[RecipeContext] Refreshing session before saving recipe...');
        const session = await auth.refreshSession();

        if (!session) {
          console.error('[RecipeContext] Failed to refresh session');
          dispatch({ type: 'REMOVE_RECIPE', payload: recipe.id });
          throw new Error('Your session has expired. Please log in again.');
        }

        console.log('[RecipeContext] Session refreshed successfully, saving recipe...');
        await saveRecipeToCloud(auth.user.id, recipe);
        console.log('[RecipeContext] Recipe saved successfully');
      } catch (error: any) {
        console.error('Failed to save recipe to cloud:', error);
        dispatch({ type: 'REMOVE_RECIPE', payload: recipe.id });
        throw error;
      }
    }
  };

  const removeRecipe = async (recipeId: string) => {
    const removedRecipe = state.savedRecipes.find(r => r.id === recipeId);
    dispatch({ type: 'REMOVE_RECIPE', payload: recipeId });

    if (auth?.user) {
      try {
        console.log('[RecipeContext] Refreshing session before removing recipe...');
        const session = await auth.refreshSession();

        if (!session) {
          console.error('[RecipeContext] Failed to refresh session');
          if (removedRecipe) {
            dispatch({ type: 'SAVE_RECIPE', payload: removedRecipe });
          }
          throw new Error('Your session has expired. Please log in again.');
        }

        console.log('[RecipeContext] Session refreshed successfully, removing recipe...');
        await removeRecipeFromCloud(auth.user.id, recipeId);
        console.log('[RecipeContext] Recipe removed successfully');
      } catch (error: any) {
        console.error('Failed to remove recipe from cloud:', error);
        if (removedRecipe) {
          dispatch({ type: 'SAVE_RECIPE', payload: removedRecipe });
        }
        throw error;
      }
    }
  };

  useEffect(() => {
    if (auth?.user) {
      syncRecipesFromCloud();
    } else {
      const savedState = localStorage.getItem('recipeAppState');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          dispatch({ type: 'LOAD_STATE', payload: { ...parsedState, discoveryRecipes: [] } });
        } catch (e) {
          console.error('Failed to load state from localStorage', e);
        }
      }
    }
  }, [auth?.user]);

  useEffect(() => {
    if (!auth?.user) {
      const stateToSave = {
        ...state,
        discoveryRecipes: []
      };
      localStorage.setItem('recipeAppState', JSON.stringify(stateToSave));
    }
  }, [state, auth?.user]);

  const value: RecipeContextValue = {
    state,
    dispatch,
    syncRecipesFromCloud,
    saveRecipe,
    removeRecipe
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}
