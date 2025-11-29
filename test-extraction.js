import fetch from 'node-fetch';

const url = 'https://www.instagram.com/p/DQa-IqHCUFJ/?hl=en';

console.log('Testing recipe extraction from Instagram...');
console.log('URL:', url);
console.log('\nMake sure the server is running: npm run server\n');

fetch('http://localhost:3000/api/extract-recipe-from-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url }),
})
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('\n=== EXTRACTION RESULT ===\n');
    console.log('Success:', data.success);

    if (data.recipe) {
      console.log('\nTitle:', data.recipe.title);
      console.log('\nIngredients:');
      data.recipe.ingredients?.forEach((ing, i) => {
        console.log(`  ${i + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`);
      });

      console.log('\nInstructions:');
      data.recipe.instructions?.forEach((inst, i) => {
        console.log(`  ${i + 1}. ${inst}`);
      });

      console.log('\nMetadata:');
      if (data.metadata) {
        console.log('  Transcript:', data.metadata.transcript?.substring(0, 200) + '...');
        console.log('  Description:', data.metadata.description?.substring(0, 200) + '...');
      }
    }

    if (data.error) {
      console.error('\nError:', data.error);
    }
  })
  .catch(error => {
    console.error('\nFetch error:', error.message);
    console.log('\nIs the server running? Start it with: npm run server');
  });
