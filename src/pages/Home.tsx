<div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
  <h1 className="text-5xl font-bold text-black mb-6 text-center">
    Welcome to Recipe Prep
  </h1>
  <p className="text-2xl text-black mb-8 text-center max-w-3xl">
    Automate your Recipe, Shopping List, and Cooking all in one place.<br />
    Extract recipes from social media, blogs, or any link — instantly saved to your app.
  </p>

  <div className="bg-gray-100 p-8 rounded-lg mb-12 max-w-3xl w-full">
    <input 
      type="text" 
      placeholder="Paste any recipe link (Instagram, TikTok, YouTube, blog...)" 
      className="w-full p-4 text-lg border border-gray-300 rounded-lg mb-4"
    />
    <button className="w-full bg-red-600 text-white py-4 text-lg font-bold rounded-lg hover:bg-red-700">
      Extract & Save Recipe Now
    </button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mb-12">
    <div className="text-center">
      <h3 className="text-2xl font-bold text-orange-600 mb-2">Discover</h3>
      <p className="text-black">Explore community recipes from around the world, including Vietnamese classics.</p>
    </div>
    <div className="text-center">
      <h3 className="text-2xl font-bold text-orange-600 mb-2">My Recipes</h3>
      <p className="text-black">All extracted and personal recipes saved here, organized and ready.</p>
    </div>
    <div className="text-center">
      <h3 className="text-2xl font-bold text-orange-600 mb-2">Add Recipe</h3>
      <p className="text-black">One click to extract from any link or create manually.</p>
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
    <div className="bg-gray-50 p-6 rounded-lg text-center">
      <h3 className="text-2xl font-bold text-orange-600 mb-2">Meal Planning</h3>
      <p className="text-black">Drag recipes to calendar or select by date/meal type. Vietnamese section included.</p>
    </div>
    <div className="bg-gray-50 p-6 rounded-lg text-center">
      <h3 className="text-2xl font-bold text-orange-600 mb-2">Smart Shopping Lists</h3>
      <p className="text-black">Auto-generated from your plans with categories: Produce, Meat, Dairy, etc.</p>
    </div>
    <div className="bg-gray-50 p-6 rounded-lg text-center">
      <h3 className="text-2xl font-bold text-orange-600 mb-2">Hands-Free Cooking</h3>
      <p className="text-black">Step-by-step cook mode with timers, voice control, and photo uploads per step.</p>
    </div>
  </div>

  <p className="mt-12 text-lg text-black">
    Get started: Paste a link above or explore below. No more screenshots — everything extracted and saved automatically.
  </p>
</div>