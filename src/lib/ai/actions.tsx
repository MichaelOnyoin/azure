import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue,
  
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'
//import { AssistantResponse, tool } from 'ai'
import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase,
  
} from '@/components/stocks'
import { azure } from '@ai-sdk/azure'
//import { OpenAI } from 'openai';
import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import { Weather } from '@/components/stocks/weather'
//import { createResource } from '@/public/db/resources';

import axios from 'axios';
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}


async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const availableModels = [
    { name: 'GPT-3.5 Turbo', model: 'gpt-35-turbo' },
    { name: 'GPT-4o-Mini', model: 'gpt-4o-mini' },
  ];

  const result = await streamUI({
    model: azure(availableModels[0].model),
    initial: <SpinnerMessage />,
    system: `\
    You are an AI assistant that helps users find information
    \nYou offer general advice in all fields 
    \nYou have codex abilities
    \nYou help with DIY (Do It Yourself skills) 
    

    You are a stock trading conversation bot and you can help users buy stocks, step by step.
    You and the user can discuss stock prices and the user can adjust the amount of stocks they want to buy, or place an order, in the UI.
    
    Messages inside [] means that it's a UI element or a user event. For example:
    - "[Price of AAPL = 100]" means that an interface of the stock price of AAPL is shown to the user.
    - "[User has changed the amount of AAPL to 10]" means that the user has changed the amount of AAPL to 10 in the UI.
    
    
    If the user requests about the weather tell the user he will be provided with a prompt to input the city, then call \`get_city_weather\` to show the weather UI.
    If the user requests purchasing a stock, call \`show_stock_purchase_ui\` to show the purchase UI.
    If the user just wants the price, call \`show_stock_price\` to show the price.
    If you want to show trending stocks, call \`list_stocks\`.
    If you want to show events, call \`get_events\`.
    If a user asks for something that requires most recent or real-time events tell the user you need to search the internet, then call \`search_the_internet\` then summarize the results you got.
    If the user wants to scrap a certain website tell the user to provide the website's url then, call \`scrapper\`
    If the user asks for a therapist, then call \`therapist\` .
    If user tells you about himself, then call \`addResource\` ,then say you have stored that information about him.
    If the user wants to sell stock, or complete another impossible task, respond that you are an AI Chatbot in training and don't have that capability yet.

    Besides that, you can also chat with users and do some calculations if needed.`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      get_city_weather: {
        description: 'Get the current weather for a city',
        parameters: z.object({
          city: z.string().describe('the city')
        }).required(),
        generate: async function* ({ city }) {
          yield (<BotCard>
                  <SpinnerMessage/>
                  </BotCard>
                )
          
          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'get_city_weather',
                    toolCallId,
                    args: { city }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'get_city_weather',
                    toolCallId,
                    result: city
                  }
                ]
              }
            ]
          })
          

          return (<BotCard><Weather/></BotCard>)
        }
      },
      search_the_internet: {
        description: 'Search the internet to get most recent(2024) or real-time information',
        parameters: z.object({ 
               query: z.string().describe('the question or query to search on the internet')
               }).required(),
        generate: async function* ({query }) {
          const BRAVE= process.env.BRAVE_API;
          const response= await axios.get('https://api.search.brave.com/res/v1/web/search', {
            headers: {
              'Accept': '*/*',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': `${BRAVE}`
            },
            params: {
                q: query,
                count: 5  ,
                extra_snippets: true
                }
          });
          const result1 = await response.data.web.results;
          yield (
            <BotCard>   
              <SpinnerMessage />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          const summarizedResults = result1.map((result1: { title: any; description: any; extra_snippets: any; url: any }, index: number) => {
            return `
              ${index + 1}. ${result1.title}
              Description: ${result1.description}
              Snippet: ${result1.extra_snippets}
              Link: ${result1.url}
            `;
          }).join('\n\n');

           const API = process.env.OPENAI_API_KEY;
            const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
              model: "gpt-3.5-turbo", // You can also use gpt-3.5 or other models
              //prompt: `Summarize the following search results:\n${summarizedResults}`,
              messages: [
                          {"role": "user", "content": `Summarize the following search results and give 1 relevant link:\n${summarizedResults}`}
                        ],
              max_tokens: 600
            }, {
              headers: {
                'Authorization': `Bearer ${API}`,
                'Content-Type': 'application/json'
              }
            });
        
            // Return the summarized response text
            const summary= openaiResponse.data.choices[0].message.content;



          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'search_the_internet',
                    toolCallId,
                    args: { query }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'search_the_internet',
                    toolCallId,
                    
                    result: summarizedResults,
                  }
                ]
              }
            ]
          })
          return(
      
              <BotCard>
                
              <div>
                <p>Search Results: {summary}</p>
              </div>
               
              </BotCard>
              
          )

         
        }
      },
      scrapper: {
        description: 'Web Scrap any information you want from the internet',
        parameters: z.object({ 
               url: z.string().describe('Enter the website you want to scrap')
               }).required(),
        generate: async function* ({url }) {
          const token: string = "e34de50f61cf4cccb4d855509e3aadb7edb6cdc8041";
          const targetUrl: string = encodeURIComponent(url);
          const render: string = "true";
          const returnJSON = "true";
          //const output = 'markdown'
          //Scrape.do does support markdown output for LLM data training or other necessary purposes. You can use the output=markdown parameter to obtain the output in markdown format when the response content-type is text/html.

          //&render=${render}  

          const config= {
            method: 'GET',
            url: `https://api.scrape.do?token=${token}&url=${targetUrl}&output=markdown`,
            headers: {}
          };
          
          const response = await axios(config);
          
          const scrap = await response.data;

          const API = process.env.OPENAI_API_KEY;
            const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
              model: "gpt-3.5-turbo", // You can also use gpt-3.5 or other models
              //prompt: `Summarize the following search results:\n${summarizedResults}`,
              messages: [
                          {"role": "user", "content": `Answer questions about this web-scrapped data:\n${scrap}`}
                        ],
              max_tokens: 1000
            }, {
              headers: {
                'Authorization': `Bearer ${API}`,
                'Content-Type': 'application/json'
              }
            });
        
            // Return the summarized response text
            const scrapper= openaiResponse.data.choices[0].message.content;

          yield (
            <BotCard>   
              <SpinnerMessage />
              <p>Scraping website data...</p>
              
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'scrapper',
                    toolCallId,
                    args: { url }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'scrapper',
                    toolCallId,
                    result: scrapper
                  }
                ]
              }
            ]
          })
          return(
      
              <BotCard>
                <p>The data from the website has been processed and stored. You can now ask questions about it!</p>        
                <p>{scrapper}</p>
              </BotCard>
            
          )        
        }
      },
      therapist :{
        description: 'This is a therapist AI bot to help improve user mental health',
        parameters: z.object({ 
               question: z.string().describe('the problem'),
               }).required(),
        generate: async function* ({question }) {
          const API = process.env.OPENAI_API_KEY;
          const assistant_id = process.env.ASSISTANT_ID ||'';
          // const openai = new OpenAI({
          //   apiKey:API
          // });
          // const myAssistant = await openai.beta.assistants.retrieve(
          //     `${assistant_id}`,
              
          // );

          // const assistant = await openai.beta.assistants.create({
          //   name: "Financial Analyst Assistant",
          //   instructions: "You are an expert financial analyst. Use you knowledge base to answer questions about audited financial statements.",
          //   model: "gpt-4o",
          //   tools: [{ type: "file_search" }],
          // });
          // console.log(assistant);

          const openaiResponse = await axios.post(`https://api.openai.com/v1/assistants/${assistant_id}`, {
            model: "gpt-4o-mini", // You can also use gpt-3.5 or other models
           // prompt: `Summarize the following search results:\n${summarizedResults}`,
            messages: [
                        {"role": "user", "content": ` ${question}:\n `}
                      ],
            max_tokens: 200
          }, {
            headers: {
              'Authorization': `Bearer ${API}`,
              'Content-Type': 'application/json'
            }
          });
      
          // Return the summarized response text
          const result = openaiResponse.data.choices[0].message.content;

          yield (
            <BotCard>   
              <SpinnerMessage />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()
          
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'therapist',
                    toolCallId,
                    args: { question }
                  }
                     
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'therapist',
                    toolCallId,
                    result: question
                  }
                ]
              }
            ]
            
          })
       

          return(
           <BotCard>
              <div>
              {question}
              <p className='text-slate-600 text-lg'> {result}</p>
              </div>
           </BotCard>
          )

         
        }
      },


      // addResource: tool({
      //   description: `add a resource to your knowledge base.
      //     If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
      //   parameters: z.object({
      //     content: z
      //       .string()
      //       .describe('the content or resource to add to the knowledge base'),
      //   }),
      //   execute: async ({ content }) => createResource({ content }),

      // }),
      
      
      
      listStocks: {
        description: 'List three imaginary stocks that are trending.',
        parameters: z.object({
          stocks: z.array(
            z.object({
              symbol: z.string().describe('The symbol of the stock'),
              price: z.number().describe('The price of the stock'),
              delta: z.number().describe('The change in price of the stock')
            })
          )
        }),
        generate: async function* ({ stocks }) {
          yield (
            <BotCard>
              <StocksSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()
          
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'listStocks',
                    toolCallId,
                    args: { stocks }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'listStocks',
                    toolCallId,
                    result: stocks
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stocks props={stocks} />
            </BotCard>
          )
        }
      },
      showStockPrice: {
        description:
          'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          delta: z.number().describe('The change in price of the stock')
        }),
        generate: async function* ({ symbol, price, delta }) {
          yield (
            <BotCard>
              <StockSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockPrice',
                    toolCallId,
                    args: { symbol, price, delta }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockPrice',
                    toolCallId,
                    result: { symbol, price, delta }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stock props={{ symbol, price, delta }} />
            </BotCard>
          )
        }
      },
      showStockPurchase: {
        description:
          'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          numberOfShares: z
            .number()
            .optional()
            .describe(
              'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
            )
        }),
        generate: async function* ({ symbol, price, numberOfShares = 100 }) {
          const toolCallId = nanoid()

          if (numberOfShares <= 0 || numberOfShares > 1000) {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares,
                        status: 'expired'
                      }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'system',
                  content: `[User has selected an invalid amount]`
                }
              ]
            })

            return <BotMessage content={'Invalid amount'} />
          } else {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares
                      }
                    }
                  ]
                }
              ]
            })

            return (
              <BotCard>
                <Purchase
                  props={{
                    numberOfShares,
                    symbol,
                    price: +price,
                    status: 'requires_action'
                  }}
                />
              </BotCard>
            )
          }
        }
      },
      getEvents: {
        description:
          'List funny imaginary events between user highlighted dates that describe stock activity.',
        parameters: z.object({
          events: z.array(
            z.object({
              date: z
                .string()
                .describe('The date of the event, in ISO-8601 format'),
              headline: z.string().describe('The headline of the event'),
              description: z.string().describe('The description of the event')
            })
          )
        }),
        generate: async function* ({ events }) {
          yield (
            <BotCard>
              <EventsSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getEvents',
                    toolCallId,
                    args: { events }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getEvents',
                    toolCallId,
                    result: events
                  }
                ]
              }
            ]
          }
          
        )

          return (
            <BotCard>
              <Events props={events} />
            </BotCard>
          )
        }
      }
    }
  })
  

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
              
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
               
                <Events props={tool.result} />
              </BotCard>
            ) : null
           
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
