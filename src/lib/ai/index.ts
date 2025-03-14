//import { createAzure } from '@ai-sdk/azure';
import { wrapLanguageModel, customProvider } from 'ai';
//import { openai } from '@ai-sdk/openai';
import { azure } from '@ai-sdk/azure';
import { customMiddleware } from './custom-middleware';

export const customModel = (apiIdentifier: string) => {
  return wrapLanguageModel({
    model: azure(apiIdentifier),
    middleware: customMiddleware,
  });
};

//export const imageGenerationModel = openai.image('dall-e-3');
export const imageGenerationModel = azure.imageModel('dall-e-2');
