"use client";
import { useState } from "react";
import { IChatGPTPayload } from "@/app/api/route";
import {
  ConverSationStyle,
  ConversationStyleToggle,
} from "./converation-style-toggle";
import { Header } from "./header";
import { PromptInput } from "./prompt-input";

export const ChatUI = () => {
  const [style, setStyle] = useState<ConverSationStyle>("FUNNY");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const promptChatGPT = async (payload: IChatGPTPayload) => {
    setIsLoading(true);
    console.log(style);
    //const response: Response = await fetch("/api/openai", {
      const response: Response = await fetch("/api/", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });

    setResponse(await response.text());
    setIsLoading(false);
  };

  return (
    <div className="w-[800px] bg-slate-800 rounded-lg overflow-hidden text-slate-400 p-5 gap-5 flex flex-col border border-blue-800/40 shadow-2xl shadow-blue-900/30">
      <Header />
      <div className="text-slate-50 max-h-[50vh] overflow-y-auto">
        {response}
      </div>

      <ConversationStyleToggle onClick={(style) => setStyle(style)} />
      <PromptInput
        isLoading={isLoading}
        onSubmit={(prompt) =>
          promptChatGPT({ converSationStyle: style, prompt })
        }
      />
    </div>
  );
};
