// HootBot/testGeckoFields.js
// Test to find where GeckoTerminal stores the actual token address

const axios = require('axios');

async function testGeckoTerminal() {
  console.log('🧪 Testing GeckoTerminal field structure...\n');
  
  try {
    // Get new pools
    const response = await axios.get('https://api.geckoterminal.com/api/v2/networks/solana/new_pools', {
      timeout: 10000
    });
    
    if (!response.data?.data?.[0]) {
      console.log('❌ No data returned');
      return;
    }
    
    // Get first pool
    const pool = response.data.data[0];
    console.log('📊 First pool structure:\n');
    
    // Show the full structure
    console.log('ID:', pool.id);
    console.log('Type:', pool.type);
    console.log('\nAttributes:');
    console.log(JSON.stringify(pool.attributes, null, 2));
    
    // Look for anything that might be a Solana address (44 characters)
    console.log('\n🔍 Looking for Solana addresses (44-char strings):\n');
    
    function findSolanaAddresses(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && value.length === 44) {
          console.log(`✅ Found address at ${currentPath}: ${value}`);
        } else if (typeof value === 'object' && value !== null) {
          findSolanaAddresses(value, currentPath);
        }
      }
    }
    
    findSolanaAddresses(pool);
    
    // Also check relationships if they exist
    if (pool.relationships) {
      console.log('\n📎 Relationships:');
      console.log(JSON.stringify(pool.relationships, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGeckoTerminal();