-- EliteCareFinders Recipe Blog Posts
-- 5 senior-friendly, Hawaii-inspired recipes
-- Run in Supabase SQL editor

INSERT INTO posts (id, title, slug, content, excerpt, images, post_type, status, metadata, published_at, created_at, updated_at, meta_title, meta_description)
VALUES (
  gen_random_uuid(),
  'Chicken Luau Soup',
  'chicken-luau-soup',
  $$<p>In old Hawaii, luau leaves were more than just a party decoration — they were a staple of the family table. Chicken luau, a dish of tender chicken simmered with young taro leaves in rich coconut milk, has been warming Hawaiian homes for generations. In adult foster care settings across the islands, this soup carries a particular kind of comfort: it tastes like something a grandmother would make, slow and unhurried, filling the house with a fragrance that feels like home.</p>
<p>For senior residents, this soup is ideal. The long simmer renders the chicken fall-apart tender, requiring almost no chewing. Taro leaves, once cooked down, become silky and mild — far gentler than raw greens. Coconut milk adds healthy fats and a creamy richness that makes every spoonful satisfying. The result is nourishing in the truest sense: warm, soft, deeply flavorful, and rooted in the place these residents have called home their whole lives.</p>
<p>Serve it in a wide, shallow bowl with a small scoop of white rice in the center. It is a meal that slows everyone down in the best way — a reminder that good food, shared in a small and caring home, is one of life's most enduring pleasures.</p>$$,
  'A slow-simmered Hawaiian chicken and taro leaf soup in coconut milk — silky, comforting, and deeply nourishing for senior residents.',
  ARRAY[
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80'
  ],
  'recipes',
  'published',
  '{
    "prepTime": 20,
    "cookTime": 75,
    "yield": "4 servings",
    "ingredients": [
      {"amount": "2 lbs", "name": "bone-in chicken thighs, skin removed"},
      {"amount": "8 cups", "name": "low-sodium chicken broth"},
      {"amount": "1 can (13.5 oz)", "name": "full-fat coconut milk"},
      {"amount": "3 cups", "name": "fresh taro (luau) leaves, stems removed, chopped — or baby spinach as substitute"},
      {"amount": "1 medium", "name": "yellow onion, diced"},
      {"amount": "4 cloves", "name": "garlic, minced"},
      {"amount": "1 tbsp", "name": "fresh ginger, grated"},
      {"amount": "1 tbsp", "name": "olive oil"},
      {"amount": "1 tsp", "name": "sea salt, or to taste"},
      {"amount": "1/2 tsp", "name": "black pepper"},
      {"amount": "2 cups", "name": "cooked white rice, for serving"},
      {"amount": "2 stalks", "name": "green onion, sliced thin, for garnish"}
    ],
    "instructions": [
      {
        "text": "In a large heavy pot, heat olive oil over medium heat. Add the diced onion and cook, stirring occasionally, for 5 minutes until softened and translucent. Add garlic and ginger and cook another 2 minutes until fragrant.",
        "image": "https://images.unsplash.com/photo-1607116882836-9da67d8d47ce?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Add the chicken thighs to the pot. Pour in the chicken broth. Bring to a boil over high heat, skimming any foam that rises to the surface. Reduce heat to low, cover, and simmer for 45 minutes.",
        "image": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Remove the chicken thighs with tongs and set aside on a cutting board. Using two forks, shred the meat off the bone into bite-sized pieces. Discard bones and any cartilage.",
        "image": "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Return shredded chicken to the pot. Stir in the coconut milk, then add the chopped taro leaves. If using fresh taro leaves, simmer uncovered for 20 minutes until leaves are completely soft and silky. If using spinach, add it in the last 3 minutes only.",
        "image": "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Taste and adjust seasoning with salt and pepper. The soup should be rich and gently flavored — not overpowering.",
        "image": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "To serve, place a small scoop of cooked white rice in the center of a wide bowl. Ladle the soup generously around the rice. Garnish with sliced green onion. Serve hot.",
        "image": "https://images.unsplash.com/photo-1503764654157-72d979d9af2f?auto=format&fit=crop&w=800&q=80"
      }
    ],
    "sourceUrl": null
  }'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  'Chicken Luau Soup Recipe | EliteCareFinders',
  'A slow-simmered Hawaiian chicken and taro leaf soup in coconut milk. Tender, soft, and nourishing — perfect for senior residents in adult foster homes.'
);

INSERT INTO posts (id, title, slug, content, excerpt, images, post_type, status, metadata, published_at, created_at, updated_at, meta_title, meta_description)
VALUES (
  gen_random_uuid(),
  'Sweet Potato and Banana Breakfast Bowl',
  'sweet-potato-banana-breakfast-bowl',
  $$<p>Mornings in a small Hawaiian care home can set the tone for the entire day. A warm, nourishing breakfast — one that smells sweet and feels comforting — tells residents that the day ahead is a good one. This Sweet Potato and Banana Breakfast Bowl does exactly that. It draws on two of Hawaii's most beloved ingredients: the golden sweet potato, grown across the islands for centuries, and the banana, which ripens in abundance in backyard gardens from Hilo to Honolulu.</p>
<p>For senior residents, this bowl is a near-perfect morning meal. Sweet potatoes are rich in potassium, vitamin A, and fiber — nutrients that support heart health, digestion, and eye function, all concerns that grow in importance with age. Bananas add natural sweetness without any added sugar, along with additional potassium and easily digestible carbohydrates for lasting morning energy. The texture is smooth and soft, making it an excellent option for residents with dental sensitivity or difficulty chewing.</p>
<p>A drizzle of local honey and a sprinkle of cinnamon finish the bowl with warmth and fragrance. Serve it alongside a small cup of decaf tea or warm milk, and breakfast becomes one of the day's quiet pleasures.</p>$$,
  'A warm, naturally sweet breakfast bowl of mashed sweet potato and ripe banana, finished with honey, cinnamon, and toasted coconut.',
  ARRAY[
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80'
  ],
  'recipes',
  'published',
  '{
    "prepTime": 10,
    "cookTime": 30,
    "yield": "4 servings",
    "ingredients": [
      {"amount": "2 large", "name": "sweet potatoes, peeled and cubed"},
      {"amount": "2 medium", "name": "ripe bananas, sliced"},
      {"amount": "1/2 cup", "name": "rolled oats (old-fashioned, not instant)"},
      {"amount": "1 1/2 cups", "name": "whole milk or unsweetened coconut milk"},
      {"amount": "1 tbsp", "name": "local Hawaiian honey, plus more to drizzle"},
      {"amount": "1 tsp", "name": "ground cinnamon"},
      {"amount": "1/4 tsp", "name": "ground nutmeg"},
      {"amount": "1/4 tsp", "name": "pure vanilla extract"},
      {"amount": "1/4 cup", "name": "unsweetened shredded coconut, lightly toasted"},
      {"amount": "pinch", "name": "sea salt"}
    ],
    "instructions": [
      {
        "text": "Place the cubed sweet potatoes in a medium saucepan. Cover with cold water by one inch. Bring to a boil over high heat, then reduce to a steady simmer. Cook for 18–22 minutes until the sweet potato is very tender when pierced with a fork.",
        "image": "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "While the sweet potatoes cook, toast the shredded coconut. Spread it in a dry skillet over medium-low heat and stir frequently for 3–4 minutes until golden and fragrant. Remove from heat immediately and set aside.",
        "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Drain the cooked sweet potatoes and return them to the saucepan over low heat. Add the milk (or coconut milk), oats, cinnamon, nutmeg, vanilla, honey, and a pinch of salt. Stir and cook for 5 minutes, until the oats are soft and the mixture is thick and creamy.",
        "image": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Using the back of a spoon or a fork, gently mash the sweet potato into the oat mixture until you reach a smooth, porridge-like consistency. Leave a few small chunks for texture if preferred.",
        "image": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Divide the warm mixture into serving bowls. Top each bowl with sliced banana, a drizzle of honey, a pinch of extra cinnamon, and the toasted coconut. Serve immediately while warm.",
        "image": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=800&q=80"
      }
    ],
    "sourceUrl": null
  }'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  'Sweet Potato and Banana Breakfast Bowl | EliteCareFinders',
  'A warm, naturally sweet breakfast bowl of mashed sweet potato, oats, and ripe banana — soft, nourishing, and perfect for seniors in Hawaiian adult foster homes.'
);

INSERT INTO posts (id, title, slug, content, excerpt, images, post_type, status, metadata, published_at, created_at, updated_at, meta_title, meta_description)
VALUES (
  gen_random_uuid(),
  'Tender Baked Salmon with Mango Avocado Salsa',
  'tender-baked-salmon-mango-avocado-salsa',
  $$<p>Hawaii's waters have always been generous. For generations, fresh fish has anchored the local diet — grilled over coals, steamed in ti leaves, or served raw over rice. Salmon, though not native to Hawaiian waters, has become a beloved part of island cooking, often paired with the tropical fruits and flavors that define the local table. This recipe brings those two worlds together: a simple oven-baked salmon fillet, perfectly tender and flaking at the touch of a fork, topped with a bright mango avocado salsa that tastes unmistakably of the islands.</p>
<p>For senior residents, salmon is one of the most valuable proteins available. It is rich in omega-3 fatty acids, which support heart health, reduce inflammation, and may help protect cognitive function — all critical concerns as people age. Baking the fish gently at a moderate temperature ensures it stays moist and soft, never dry or tough. The mango avocado salsa adds vitamins C and E, healthy monounsaturated fats from the avocado, and a burst of fresh sweetness that makes this feel like a special occasion meal even on a Tuesday.</p>
<p>Serve it alongside steamed white rice and a simple green vegetable, and you have a complete, beautiful dinner that honors both the residents' health and their sense of place.</p>$$,
  'Gently oven-baked salmon fillets topped with a fresh mango avocado salsa — heart-healthy, soft, and full of Hawaiian sunshine.',
  ARRAY[
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80'
  ],
  'recipes',
  'published',
  '{
    "prepTime": 15,
    "cookTime": 20,
    "yield": "4 servings",
    "ingredients": [
      {"amount": "4 fillets (6 oz each)", "name": "salmon, skin-on, pin bones removed"},
      {"amount": "2 tbsp", "name": "olive oil"},
      {"amount": "1 tsp", "name": "sea salt"},
      {"amount": "1/2 tsp", "name": "black pepper"},
      {"amount": "1 tsp", "name": "garlic powder"},
      {"amount": "1 tsp", "name": "smoked paprika"},
      {"amount": "1 large", "name": "ripe mango, peeled and diced small"},
      {"amount": "1 large", "name": "ripe avocado, diced"},
      {"amount": "2 tbsp", "name": "red onion, finely minced"},
      {"amount": "1 tbsp", "name": "fresh lime juice"},
      {"amount": "2 tbsp", "name": "fresh cilantro, chopped (optional)"},
      {"amount": "1 tsp", "name": "local Hawaiian honey"}
    ],
    "instructions": [
      {
        "text": "Preheat your oven to 375°F (190°C). Line a baking sheet with parchment paper or lightly oil a baking dish. Pat the salmon fillets dry with paper towels — this helps the seasoning adhere and promotes even cooking.",
        "image": "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Brush each fillet on all sides with olive oil. In a small bowl, combine the salt, pepper, garlic powder, and smoked paprika. Sprinkle the seasoning evenly over the tops and sides of each fillet.",
        "image": "https://images.unsplash.com/photo-1555243896-c709bfa0b564?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Place the salmon fillets skin-side down on the prepared baking sheet. Bake for 16–20 minutes, depending on thickness, until the fish is opaque throughout and flakes easily when pressed gently with a fork. Do not overbake — the center should still look slightly glossy.",
        "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "While the salmon bakes, prepare the salsa. In a medium bowl, combine the diced mango, avocado, and red onion. Add the lime juice and honey. Stir gently to combine, taking care not to mash the avocado. If using cilantro, fold it in. Taste and adjust with a pinch of salt if needed.",
        "image": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Remove salmon from the oven and let it rest for 2 minutes. Carefully slide a spatula between the flesh and the skin to lift the fillet free, leaving the skin behind on the pan for easy serving.",
        "image": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Place each fillet on a plate over a scoop of steamed white rice. Spoon the mango avocado salsa generously over the top of each portion. Serve immediately.",
        "image": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
      }
    ],
    "sourceUrl": null
  }'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  'Tender Baked Salmon with Mango Avocado Salsa | EliteCareFinders',
  'A heart-healthy baked salmon recipe with fresh mango avocado salsa — soft, flavorful, and full of nutrients ideal for senior residents in Hawaii adult foster homes.'
);

INSERT INTO posts (id, title, slug, content, excerpt, images, post_type, status, metadata, published_at, created_at, updated_at, meta_title, meta_description)
VALUES (
  gen_random_uuid(),
  'Banana Oatmeal Pancakes',
  'banana-oatmeal-pancakes',
  $$<p>There is something universally cheerful about pancakes on the griddle — the smell alone is enough to bring people to the kitchen. In a small adult foster home, where mornings are unhurried and mealtimes are shared, a stack of warm pancakes can feel like a celebration of the ordinary. These Banana Oatmeal Pancakes are a staple worth making every week. They are soft, pillowy, and naturally sweet from ripe bananas — no syrup required, though a drizzle of local honey never hurts.</p>
<p>What makes these pancakes particularly well-suited for senior residents is their gentle ingredient list. Rolled oats replace a portion of the flour, adding soluble fiber that supports healthy digestion and helps maintain stable blood sugar levels — important for residents managing diabetes or pre-diabetes. Ripe bananas provide natural sweetness and potassium. The batter comes together in one bowl with no complicated steps, making it practical even on a busy morning. Because there is no refined sugar and very little fat, these pancakes are kind to aging hearts and digestive systems without sacrificing any of the comfort.</p>
<p>Serve them warm with sliced banana and a light drizzle of honey. They are soft enough to eat without a knife, which matters more than it might seem for residents who struggle with utensils or chewing.</p>$$,
  'Soft, naturally sweet pancakes made with ripe banana and rolled oats — high in fiber, gentle on digestion, and a favorite morning treat.',
  ARRAY[
    'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=1200&q=80'
  ],
  'recipes',
  'published',
  '{
    "prepTime": 10,
    "cookTime": 20,
    "yield": "4 servings (12 small pancakes)",
    "ingredients": [
      {"amount": "2 large", "name": "very ripe bananas (the riper, the sweeter)"},
      {"amount": "2 large", "name": "eggs"},
      {"amount": "1 cup", "name": "rolled oats (old-fashioned)"},
      {"amount": "1/2 cup", "name": "whole wheat flour or all-purpose flour"},
      {"amount": "3/4 cup", "name": "whole milk or oat milk"},
      {"amount": "1 tsp", "name": "baking powder"},
      {"amount": "1/2 tsp", "name": "ground cinnamon"},
      {"amount": "1/4 tsp", "name": "pure vanilla extract"},
      {"amount": "pinch", "name": "sea salt"},
      {"amount": "1 tbsp", "name": "coconut oil or butter, for the pan"},
      {"amount": "2 tbsp", "name": "local honey, for serving"},
      {"amount": "1 medium", "name": "banana, sliced, for serving"}
    ],
    "instructions": [
      {
        "text": "In a large mixing bowl, mash the ripe bananas thoroughly with a fork until almost smooth — a few small lumps are fine and will add texture. The riper the bananas, the sweeter and more flavorful your pancakes will be.",
        "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Add the eggs, milk, and vanilla extract to the mashed banana. Whisk until well combined.",
        "image": "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Add the rolled oats, flour, baking powder, cinnamon, and salt. Stir gently until just combined — do not overmix. Let the batter rest for 5 minutes so the oats can absorb the liquid and soften slightly.",
        "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Heat a non-stick skillet or griddle over medium-low heat. Add a small amount of coconut oil or butter and let it melt, swirling to coat the pan. The pan should be warm but not smoking — banana pancakes cook better at a lower temperature than traditional pancakes.",
        "image": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Pour about 3 tablespoons of batter per pancake onto the skillet. Cook for 3–4 minutes until bubbles form on the surface and the edges look set. Flip carefully with a thin spatula and cook another 2–3 minutes until golden on the bottom. These pancakes are more delicate than standard pancakes, so flip with care.",
        "image": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Keep cooked pancakes warm in a 200°F oven on a baking sheet while you finish the remaining batter. Serve in a short stack of 3 pancakes per person, topped with fresh banana slices and a drizzle of local honey.",
        "image": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80"
      }
    ],
    "sourceUrl": null
  }'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  'Banana Oatmeal Pancakes Recipe | EliteCareFinders',
  'Soft, naturally sweet banana oatmeal pancakes with no refined sugar — a fiber-rich, senior-friendly breakfast for Hawaii adult foster home residents.'
);

INSERT INTO posts (id, title, slug, content, excerpt, images, post_type, status, metadata, published_at, created_at, updated_at, meta_title, meta_description)
VALUES (
  gen_random_uuid(),
  'Slow-Cooked Beef and Root Vegetable Stew',
  'slow-cooked-beef-root-vegetable-stew',
  $$<p>Some meals ask nothing of you except patience, and patience is exactly what makes them extraordinary. This Slow-Cooked Beef and Root Vegetable Stew is one of those meals. It begins simply — a few pounds of beef, root vegetables, a good broth — and over the course of several hours on the stove or in a slow cooker, it transforms into something deeply satisfying: rich, dark, fragrant, and tender enough to eat with only a spoon.</p>
<p>In Hawaii's adult foster homes, a stew like this serves a quiet but important role. The hours of slow cooking break down the collagen in tougher cuts of beef — like chuck roast — into gelatin that makes the broth silky and the meat almost impossibly tender. There is no chewing required; the beef yields completely. Root vegetables like carrots, parsnips, and potato absorb the braising liquid and become soft throughout, making them easy to eat and digest. The result is a meal that is simultaneously warming and substantial, providing plenty of protein, iron, and complex carbohydrates to sustain residents through the afternoon.</p>
<p>This stew also gets better with time — leftovers the next day are even more flavorful as everything continues to meld overnight. Make a full pot, serve it over rice or with soft bread, and let the aroma fill the home with something that feels, unmistakably, like care.</p>$$,
  'A slow-simmered beef and root vegetable stew with fall-apart tender meat and silky broth — hearty, nourishing, and deeply comforting for seniors.',
  ARRAY[
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=1200&q=80'
  ],
  'recipes',
  'published',
  '{
    "prepTime": 25,
    "cookTime": 180,
    "yield": "6 servings",
    "ingredients": [
      {"amount": "2 lbs", "name": "beef chuck roast, trimmed and cut into 1.5-inch cubes"},
      {"amount": "3 tbsp", "name": "olive oil, divided"},
      {"amount": "1 large", "name": "yellow onion, diced"},
      {"amount": "4 cloves", "name": "garlic, minced"},
      {"amount": "3 medium", "name": "carrots, peeled and sliced into 1-inch rounds"},
      {"amount": "2 medium", "name": "parsnips, peeled and sliced into 1-inch rounds"},
      {"amount": "3 medium", "name": "Yukon Gold potatoes, peeled and cut into 1-inch cubes"},
      {"amount": "2 stalks", "name": "celery, sliced"},
      {"amount": "4 cups", "name": "low-sodium beef broth"},
      {"amount": "1 can (14.5 oz)", "name": "diced tomatoes, no salt added"},
      {"amount": "2 tbsp", "name": "tomato paste"},
      {"amount": "1 tsp", "name": "dried thyme"},
      {"amount": "1 tsp", "name": "dried rosemary"},
      {"amount": "1 tsp", "name": "sea salt, or to taste"},
      {"amount": "1/2 tsp", "name": "black pepper"}
    ],
    "instructions": [
      {
        "text": "Pat the beef cubes completely dry with paper towels and season generously with salt and pepper. Drying the meat is essential — it ensures a proper sear rather than steaming, which develops the deep flavor base of the whole stew.",
        "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Heat 2 tablespoons of olive oil in a large heavy-bottomed pot or Dutch oven over medium-high heat until shimmering. Working in two batches to avoid crowding, sear the beef on all sides for about 3–4 minutes per batch until deeply browned. Transfer browned beef to a plate and set aside.",
        "image": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Reduce heat to medium. Add the remaining tablespoon of olive oil to the pot. Add the onion and celery and cook, stirring, for 5 minutes until softened. Add the garlic, thyme, and rosemary and cook for another 2 minutes, stirring frequently.",
        "image": "https://images.unsplash.com/photo-1607116882836-9da67d8d47ce?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Stir in the tomato paste and cook for 2 minutes, letting it darken slightly. Add the diced tomatoes, then pour in the beef broth, scraping up any browned bits from the bottom of the pot with a wooden spoon — this is where all the flavor lives.",
        "image": "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Return the seared beef to the pot along with any juices that have collected on the plate. Bring to a gentle boil, then reduce heat to the lowest possible simmer. Cover tightly and cook for 1 hour 30 minutes.",
        "image": "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "After 1 hour 30 minutes, add the carrots, parsnips, potatoes, and celery to the pot. Stir to submerge them in the broth. Cover and continue cooking on low for another 1 hour, until the vegetables are completely tender and the beef falls apart when pressed with a spoon.",
        "image": "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?auto=format&fit=crop&w=800&q=80"
      },
      {
        "text": "Taste the stew and adjust salt and pepper as needed. The broth should be rich and deeply savory. If it seems thin, raise the heat and simmer uncovered for 10–15 minutes to concentrate it. Serve hot in wide bowls over steamed white rice or with soft dinner rolls.",
        "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80"
      }
    ],
    "sourceUrl": null
  }'::jsonb,
  NOW(),
  NOW(),
  NOW(),
  'Slow-Cooked Beef and Root Vegetable Stew | EliteCareFinders',
  'A rich, fall-apart beef stew with tender root vegetables — slow-simmered for maximum flavor and nutrition, ideal for senior residents in Hawaii adult foster homes.'
);
