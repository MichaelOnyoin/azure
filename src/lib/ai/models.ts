// Define your models here. The model id should match the model name in the Azure OpenAI deployment
export interface Model {
    id: string;
    label: string;
    apiIdentifier: string;
    description: string;
  }
  
  export const models: Array<Model> = [
    {
      id: 'gpt-4o-mini',
      label: 'GPT 4o mini',
      apiIdentifier: 'gpt-4o-mini',
      description: 'For complex, multi-step tasks',
    },
    {
      id: 'gpt-35-turbo-16k',
      label: 'GPT 35 turbo 16k',
      apiIdentifier: 'gpt-35-turbo-16k',
      description: 'Small model for fast, lightweight tasks',
    },
    {
      id: 'gpt-35-turbo',
      label: 'GPT 35 turbo',
      apiIdentifier: 'gpt-35-turbo-16k',
      description: 'For the simple stuff',
    },
    
  
  ] as const;
  
  // export const DEFAULT_MODEL_NAME: string = 'gpt-4o-mini';
  export const DEFAULT_MODEL_NAME: string = 'gpt-35-turbo-16k';