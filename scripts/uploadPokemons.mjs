import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function uploadToIPFS(content) {
  try {
    // If content is a file path, use ipfs add directly
    if (typeof content === 'string') {
      const { stdout } = await execAsync(`ipfs add -Q "${content}"`);
      return stdout.trim();
    }
    // If content is an object, write it to a temp file first
    else if (typeof content === 'object') {
      const tempFile = path.join(process.cwd(), 'temp_metadata.json');
      fs.writeFileSync(tempFile, JSON.stringify(content, null, 2));
      const { stdout } = await execAsync(`ipfs add -Q "${tempFile}"`);
      fs.unlinkSync(tempFile); // Clean up temp file
      return stdout.trim();
    }
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

async function main() {
  try {
    // Check if IPFS daemon is running
    await execAsync('ipfs id');
    console.log('Connected to IPFS node');

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
      metadata.image = `ipfs://${imageCid}`;
      metadata.name = pokemonName;
      metadata.description = `A Pokémon NFT of ${pokemonName}`;

      // Upload updated metadata to IPFS
      const metadataCid = await uploadToIPFS(metadata);
      console.log(`Uploaded metadata for ${pokemonName}: ${metadataCid}`);

      // Store mapping
      pokemonMapping[pokemonName] = metadataCid;
    }

    // Create mint_metadata directory if it doesn't exist
    const mintMetadataDir = './mint_metadata';
    if (!fs.existsSync(mintMetadataDir)) {
      fs.mkdirSync(mintMetadataDir);
    }

    // Save mapping to file
    const outputPath = path.join(mintMetadataDir, 'pokemon_cid_mapping.json');
    fs.writeFileSync(outputPath, JSON.stringify(pokemonMapping, null, 2));
    console.log(`\n✅ Successfully saved CID mapping to ${outputPath}`);

  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

main();
