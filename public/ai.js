const { AzureOpenAI } = require("openai");  
      const dotenv = require("dotenv");  
        
      dotenv.config();  
        
      async function main() {  
        // You will need to set these environment variables or edit the following values
        const endpoint = process.env["AZURE_OPENAI_ENDPOINT"] || "https://ai-moonyoingaipa589005681748.openai.azure.com/openai/deployments/";  
        const apiKey = process.env["AZURE_OPENAI_API_KEY"] || "b0b9a2e7b8944509a89cbec344aa04e4";  
        const apiVersion = "2024-05-01-preview";  
        const deployment = "gpt-35-turbo (version:0125)"; // This must match your deployment name
        
        const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });  
        
        const result = await client.chat.completions.create({  
          messages: [  
            { role: "user", content: "What is the purpose of life?" },  
            { role: "assistant", content: "The purpose of life is to be happy." },
              
          ], 
          max_tokens: 800,  
          temperature: 0.7,  
          top_p: 0.95,  
          frequency_penalty: 0,  
          presence_penalty: 0,  
          stop: null
        });  
        
        console.log(JSON.stringify(result, null, 2));  
      }  
        
      main().catch((err) => {  
        console.error("The sample encountered an error:", err);  
      });  
        
      module.exports = { main };