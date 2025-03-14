import OpenAI from "openai";

const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: 'sk-a310af21411d4fe5b1b39a4c2db3164d'
});

export default async function Deepseek() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "What is the purpose of physics" }
    ],
    model: "deepseek-chat",
  });

  console.log(completion.choices[0].message.content);

  return(
    <div className="justify-center items-center"> 
        <h1>Deepseek</h1>
        <p>{completion.choices[0].message.content}</p>
    </div>
  )
}