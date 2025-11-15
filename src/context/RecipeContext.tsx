import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Recipe, MealPlanEntry, GroceryListItem, UserPreferences } from '../types/recipe';
import { buildUserProfile, UserProfile, trackRecipeInteraction, updateUserPreferenceAnalytics } from '../services/recommendationService';

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
  | { type: 'LOAD_STATE'; payload: RecipeState };

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

const RecipeContext = createContext<{
  state: RecipeState;
  dispatch: React.Dispatch<RecipeAction>;
} | undefined>(undefined);

function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case 'SAVE_RECIPE': {
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
    default:
      return state;
  }
}

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(recipeReducer, initialState);

  useEffect(() => {
    const savedState = localStorage.getItem('recipeAppState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        dispatch({ type: 'LOAD_STATE', payload: { ...parsedState, discoveryRecipes: [] } });
      } catch (e) {
        console.error('Failed to load state from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    const stateToSave = {
      ...state,
      discoveryRecipes: []
    };
    localStorage.setItem('recipeAppState', JSON.stringify(stateToSave));
  }, [state]);

  return (
    <RecipeContext.Provider value={{ state, dispatch }}>
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
