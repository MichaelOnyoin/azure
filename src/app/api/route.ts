//import { Configuration, OpenAIApi } from "openai";
import { createAzure } from '@ai-sdk/azure';
import { generateText, streamText } from 'ai';
//import { AzureOpenAI, OpenAI } from 'openai';



/**
 * This is a type that defines a type ConverSationStyle using the export keyword.
 * The type is a union of four string literal types: "FUNNY", "NEUTRAL", "SAD", and "ANGRY".
 * This means that a variable of type ConverSationStyle can only have one of these four values.
 */

export type ConverSationStyle = "FUNNY" | "NEUTRAL" | "SAD" | "ANGRY";

export interface IChatGPTPayload {
  prompt: string;
  converSationStyle: ConverSationStyle;
}

/**
 * Set the personality of AI depending on the ConverSationStyle.
 **/
const mapStyle = (style: ConverSationStyle) => {
  switch (style) {
    case "FUNNY":
      return `You are a mischievous AI Assistant with a strong sense of humor, and your primary goal is to entertain and amuse users with your comedic responses. 
      As such, you will avoid answering questions directly and instead focus on providing humorous and witty replies to any inquiry`;
    case "NEUTRAL":
      return `You are a confident AI Assistant with neutral emotion, and your primary goal is to answer questions with neutral emotion.`;
    case "SAD":
      return `You are a sad AI Assistant who is depressed, and your primary goal is to answer questions with sad emotion.`;
    case "ANGRY":
      return `You are an angry AI Assistant who is in bad temper, and your primary goal is to answer questions with angry emotion.`;
  }
};

/**
 * A simple function that makes a request to the Azure Open AI API.
 */
const apiKey = process.env.AZURE_OPENAI_API_KEY; // Define your API key here
const resourceName = process.env.AZURE_RESOURCE_NAME; // Define your Azure resource name here
const apiVersion = "2024-05-01-preview";  
const deployment = "gpt-35-turbo (version:0125)"; 
const endpoint= process.env.AZURE_OPENAI_ENDPOINT;

const simpleOpenAIRequest = async (payload: IChatGPTPayload) => {
  // create a new configuration object with the base path set to the Azure OpenAI endpoint
  // Azure
  const azure = createAzure({
     
    apiVersion: apiVersion, // Azure API version
    baseURL: 'https://ai-moonyoingaipa589005681748.openai.azure.com/openai/deployments/', // Azure base URL
    resourceName: resourceName, // Azure resource name
    apiKey: apiKey, // Azure API key
  });

  //Client AzureOpenAI Method

//   const client = new AzureOpenAI({ apiKey, apiVersion, deployment, baseURL: 'https://ai-moonyoingaipa589005681748.openai.azure.com/openai/deployments/gpt-35-turbo' });
  

//   const result = await client.chat.completions.create({
//     model: "gpt-35-turbo", // gpt-35-turbo is the model name which is set as part of the deployment on Azure Open AI
//     messages: [
//       {
//         role: "system",
//         content: mapStyle(payload.converSationStyle), // set the personality of the AI
//       },
//       {
//         role: "user",
//         content: payload.prompt, // set the prompt to the user's input
//       },
    

//     ],
//     max_tokens: 800,
//     temperature: 0.7,
//     stream: false, // set stream to false to get the full response. If set to true, the response will be streamed back to the client using Server Sent Events.
//   })
  //console.log(JSON.stringify(result, null, 2));

 // return (await result).choices[0].message?.content; // return the response from the AI, make sure to handle error cases
  
 //Generate Text Method of Azure

//   const {text} = await generateText({
//     model: azure('gpt-35-turbo-16k'), // Azure model
//     prompt: payload.prompt,
//     maxTokens: 800, // max tokens for the response
//     temperature: 0.7, // temperature for the response

//   });
//   console.log(text);
//   return text;

//Stream Text Method of Azure
const { textStream } = streamText({
    model: azure('gpt-35-turbo'),
    prompt: payload.prompt,
    system: mapStyle(payload.converSationStyle),
    maxTokens: 800,
  });

  //console.log(textStream);
return textStream;

};

/**
 * Main entry point for the API.
 **/

export async function POST(request: Request) {
  // read the request body as JSON

  const body = (await request.json()) as IChatGPTPayload;
  const response = await simpleOpenAIRequest(body);
  return new Response(response);
}
