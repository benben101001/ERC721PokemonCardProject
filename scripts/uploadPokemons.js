const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');

// Initialize IPFS client
const ipfs = create({
  host: '127.0.0.1',
  port: 5001,
  protocol: 'http'
});

async function uploadToIPFS(filePath) {
  try {
    const file = fs.readFileSync(filePath);
    const result = await ipfs.add(file);
    return result.cid.toString();
  } catch (error) {
    console.error(`Error uploading ${filePath} to IPFS:`, error);
    throw error;
  }
}

async function main() {
  try {
    // Check if IPFS node is running
    const id = await ipfs.id();
    console.log('Connected to IPFS node:', id.id);

    const metadataDir = './PokemonMetadata/pokemon_metadata';
    const imagesDir = './PokemonMetadata/pokemon_images';
    const pokemonMapping = {};

    // Read all metadata files
    const metadataFiles = fs.readdirSync(metadataDir);
    
    for (const file of metadataFiles) {
      if (!file.endsWith('.json')) continue;
      
      const pokemonName = path.basename(file, '.json');
      const metadataPath = path.join(metadataDir, file);
      const imagePath = path.join(imagesDir, `${pokemonName}.png`);

      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        console.error(`Image not found for ${pokemonName}`);
        continue;
      }

      // Upload image to IPFS
      const imageCid = await uploadToIPFS(imagePath);
      console.log(`Uploaded image for ${pokemonName}: ${imageCid}`);

      // Read and update metadata
      const metadata = JSON.parse(fs.readFileSync(metadataPath));
      metadata.image = `ipfs://${imageCid}/${pokemonName}.png`;

      // Upload metadata to IPFS
      const metadataCid = await uploadToIPFS(metadataPath);
      console.log(`Uploaded metadata for ${pokemonName}: ${metadataCid}`);

      // Store mapping
      pokemonMapping[pokemonName] = metadataCid;
    }

    // Save mapping to file
    const outputPath = './mint_metadata/pokemon_cid_mapping.json';
    fs.writeFileSync(outputPath, JSON.stringify(pokemonMapping, null, 2));
    console.log(`\n✅ Successfully saved CID mapping to ${outputPath}`);

  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

main();
