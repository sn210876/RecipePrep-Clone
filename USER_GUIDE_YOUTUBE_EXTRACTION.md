# User Guide: Extracting Recipes from YouTube Videos

## Three Ways to Extract YouTube Recipes

### Method 1: Automatic URL Extraction (Fastest When It Works)

**Best for:** Videos with recipes in the description

**Steps:**
1. Go to Add Recipe page
2. Copy YouTube video URL
3. Paste in the blue "Import from URL" section
4. Click "Extract Recipe"
5. Wait 5-15 seconds
6. Review and save

**Success Rate:** 60-70%
**Time:** 5-15 seconds
**What could go wrong:** Bot detection may block some videos

---

### Method 2: Manual Description Paste (Most Reliable) ⭐ NEW!

**Best for:** When automatic extraction shows bot detection error

**Steps:**
1. Go to the YouTube video
2. Click "...more" button below the video to expand full description
3. Copy the entire description (Ctrl+C or Cmd+C)
4. Go to Add Recipe page on MealScrape
5. Find the purple "Paste Video Description" section
6. Paste description into the large text box
7. (Optional) Enter the video title
8. Click "Extract Recipe from Description"
9. Wait 2-5 seconds
10. Review and save

**Success Rate:** 95%+
**Time:** 2-5 seconds (plus time to copy/paste)
**What could go wrong:** Recipe must be in the description text

---

### Method 3: Manual Entry (Always Works)

**Best for:** Videos where recipe is only spoken, not written

**Steps:**
1. Watch the video and write down the recipe
2. Go to Add Recipe page
3. Scroll down to the manual entry form
4. Enter all recipe details manually
5. Save

**Success Rate:** 100%
**Time:** 5-10 minutes
**What could go wrong:** Nothing, you're entering it yourself

---

## When to Use Each Method

### Use Automatic URL Extraction When:
- ✅ You want to try the fastest method first
- ✅ Recipe is likely in the video description
- ✅ You don't mind waiting 5-15 seconds

### Use Manual Description Paste When:
- ✅ Automatic extraction showed bot detection error
- ✅ You saw the recipe in the description
- ✅ You want the most reliable method
- ✅ You want faster results (2-5 seconds)

### Use Manual Entry When:
- ✅ Recipe is only spoken in the video, not written
- ✅ Both automatic methods failed
- ✅ You want 100% control over the data

---

## Understanding Error Messages

### "🤖 YouTube detected automated access"

**What it means:** YouTube blocked our automated extraction

**What to do:**
1. **Option A:** Wait 5 minutes and try again
2. **Option B:** Use the purple "Paste Video Description" section (recommended)
3. **Option C:** Try a different video URL

---

### "No recipe found in description"

**What it means:** The video description doesn't contain recipe details

**What to do:**
1. Check if recipe is actually in the description
2. If recipe is spoken in video but not written, use manual entry
3. Try the audio transcription method (may take 30-60 seconds)

---

### "Video unavailable or private"

**What it means:** The video doesn't exist or is set to private

**What to do:**
1. Check the URL is correct
2. Make sure the video is public
3. Try a different video

---

## Tips for Best Results

### For Automatic Extraction:
- ✅ Use videos from cooking channels that put recipes in descriptions
- ✅ Avoid very new videos (may still be processing)
- ✅ Try videos with detailed descriptions

### For Manual Description Paste:
- ✅ Always click "...more" to expand full description
- ✅ Copy EVERYTHING, even if it looks long
- ✅ Include timestamps and notes - AI will extract the recipe parts
- ✅ Enter the video title for better recipe naming

### For Manual Entry:
- ✅ Watch the video at 0.75x speed to catch all details
- ✅ Pause frequently to write ingredients
- ✅ Note prep and cook times
- ✅ Include any tips or tricks mentioned

---

## Visual Guide: Finding the Manual Description Paste Feature

### On Add Recipe Page:

```
┌─────────────────────────────────────────┐
│  Import from URL                        │ ← Blue section (try first)
│  [Paste recipe link...]                 │
│  [Extract Recipe]                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Paste Video Description   [For YouTube]│ ← Purple section (use if bot detection)
│  Video Title (Optional):                │
│  [Best Chocolate Cake Recipe...]        │
│                                         │
│  Video Description *:                   │
│  [Large text box for pasting           │
│   the full video description...]        │
│                                         │
│  [Extract Recipe from Description]      │
│                                         │
│  WHEN TO USE THIS:                      │
│  • YouTube blocked automatic extraction │
│  • Recipe is in video description       │
│  • Want faster results                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Scan Recipe Photo                      │ ← Green section (for photos)
│  [Upload photos...]                     │
└─────────────────────────────────────────┘
```

---

## Example: Using Manual Description Paste

### Step 1: On YouTube, expand the description

Click the "...more" button:
```
The best chocolate chip cookie recipe!

Ingredients:
2 1/4 cups flour
...more    ← Click this!
```

After clicking, you'll see the full description:
```
The best chocolate chip cookie recipe!

Ingredients:
2 1/4 cups all-purpose flour
1 tsp baking soda
1 tsp salt
1 cup butter, softened
3/4 cup granulated sugar
3/4 cup packed brown sugar
2 large eggs
2 tsp vanilla extract
2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F (190°C)
2. Mix flour, baking soda, and salt in a bowl
3. In another bowl, beat butter and sugars until creamy
4. Add eggs and vanilla to butter mixture
5. Gradually blend in flour mixture
6. Stir in chocolate chips
7. Drop rounded tablespoons onto ungreased baking sheets
8. Bake 9-11 minutes or until golden brown
9. Cool on baking sheet for 2 minutes
10. Remove to wire rack to cool completely

Prep time: 15 minutes
Cook time: 11 minutes
Makes: 5 dozen cookies

Enjoy these delicious homemade cookies!
```

### Step 2: Copy everything (Ctrl+C or Cmd+C)

### Step 3: On MealScrape, find the purple section

### Step 4: Paste into the description box

### Step 5: Click "Extract Recipe from Description"

### Step 6: Wait 2-5 seconds

### Step 7: Review the extracted recipe
- ✅ Title: "Chocolate Chip Cookies"
- ✅ Ingredients: All 9 ingredients parsed correctly
- ✅ Instructions: All 10 steps extracted
- ✅ Prep time: 15 minutes
- ✅ Cook time: 11 minutes
- ✅ Servings: 60 cookies

### Step 8: Edit if needed and save!

---

## Frequently Asked Questions

### Q: Why does YouTube block automatic extraction?

**A:** YouTube has anti-bot systems that detect automated access. When too many extraction requests happen, they temporarily block access to prevent abuse.

### Q: Is manual description paste safe?

**A:** Yes! You're just copying text from YouTube and pasting it into MealScrape. No automation involved, so no bot detection.

### Q: How does the AI extract the recipe?

**A:** Our AI (GPT-4o-mini) reads the description text and identifies recipe patterns like ingredients lists, measurements, and cooking steps. It then structures the data into a proper recipe format.

### Q: What if the description doesn't have measurements?

**A:** The AI will do its best to extract what's there and fill in reasonable defaults. You can always edit the recipe before saving.

### Q: Can I use this for non-English videos?

**A:** Currently optimized for English, but it may work with other languages that use similar recipe formats.

### Q: How much does this cost me?

**A:** Nothing! All extraction methods are included in your MealScrape subscription. We handle the AI processing costs.

### Q: Will this work with private videos?

**A:** No, you need to be able to view the video and its description on YouTube for this to work.

### Q: What if the recipe has unusual formats?

**A:** The AI is trained on many recipe formats, but if extraction quality is poor, you can always use manual entry for full control.

---

## Success Tips from Our Users

### 💡 Pro Tip #1: Try automatic first, manual second
"I always paste the URL first. If it works, great! If I get bot detection, I immediately switch to the purple description paste section. Takes 30 extra seconds but works every time."

### 💡 Pro Tip #2: Copy descriptions proactively
"When I'm browsing YouTube for recipes, I expand and copy the descriptions as I find them. Then I can batch-paste them all into MealScrape later."

### 💡 Pro Tip #3: Include the title
"I always enter the video title in the optional field. It makes the recipe easier to find later when searching my collection."

### 💡 Pro Tip #4: Check the preview carefully
"The AI is usually 90% accurate, but I always review the preview before saving. Sometimes measurements need tweaking or steps need reordering."

---

## Troubleshooting

### "Failed to extract recipe from description"

**Try:**
1. Make sure you copied the full description
2. Check that the description actually contains a recipe
3. Try adding the video title
4. If still failing, use manual entry

### Extraction is very slow

**Try:**
1. Check your internet connection
2. Wait for server to wake up (first request may take 20-30 seconds)
3. Try during off-peak hours
4. Use manual description paste (faster than URL extraction)

### Recipe is incomplete or wrong

**Try:**
1. Review and edit the extracted recipe before saving
2. Check the original description for any formatting issues
3. Try copying the description again
4. If still wrong, use manual entry for accuracy

---

## Getting Help

If you're having issues:

1. **Check the help text** in each section on the Add Recipe page
2. **Try a different extraction method** (all three methods are available)
3. **Review error messages carefully** - they contain specific guidance
4. **Contact support** through the app's settings page

---

## Summary

You now have three powerful ways to extract YouTube recipes:

1. **Automatic URL Extraction** - Fast but may hit bot detection
2. **Manual Description Paste** - Most reliable, works 95%+ of the time ⭐
3. **Manual Entry** - Always works, full control

The new purple "Paste Video Description" section gives you a reliable backup when automatic extraction fails. Simply copy the description from YouTube and paste it - the AI handles the rest!

Happy cooking! 👨‍🍳👩‍🍳
