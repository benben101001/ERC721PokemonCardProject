import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

// Directories
const metadataDir = './pokemon_metadata';
const imageDir = './pokemon_images';

// Create directories if they don't exist
if (!fs.existsSync(metadataDir)) {
  fs.mkdirSync(metadataDir);
}
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir);
}

async function fetchPokemon(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const data = await res.json();

  const name = data.name;
  const imageFileName = `${name}.png`;
  const spriteLocalPath = `${imageDir}/${imageFileName}`;
  const ipfsPlaceholder = `ipfs://<REPLACE_WITH_IMAGE_CID>/${imageFileName}`;

  // Download and save the sprite
  const spriteUrl = data.sprites.front_default;
  if (spriteUrl) {
    const imgRes = await fetch(spriteUrl);
    const buffer = await imgRes.buffer();
    fs.writeFileSync(spriteLocalPath, buffer);
  } else {
    console.warn(`No sprite found for ${data.name}`);
  }

  // Build MetaMask-compatible metadata
  const metadata = {
    name: `${name.charAt(0).toUpperCase() + name.slice(1)} #${id}`,
    description: `A Pokémon NFT of ${name}`,
    image: ipfsPlaceholder,
    attributes: [
      ...data.types.map(t => ({
        trait_type: "Type",
        value: t.type.name
      })),
      {
        trait_type: "Height",
        value: data.height
      },
      {
        trait_type: "Weight",
        value: data.weight
      }
    ]
  };

  return metadata;
}

async function saveMetadata(pokemon) {
  const filePath = path.join(metadataDir, `${pokemon.name.split(' ')[0].toLowerCase()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(pokemon, null, 2));
}

async function main() {
  for (let id = 1; id <= 100; id++) {
    try {
      const pokemon = await fetchPokemon(id);
      await saveMetadata(pokemon);
      console.log(`Saved ${pokemon.name}`);
    } catch (error) {
      console.error(`Failed to fetch/save Pokémon ${id}:`, error);
    }
  }
}

main();
